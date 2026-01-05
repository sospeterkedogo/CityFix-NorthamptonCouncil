import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, query, collection, where, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { registerForPushNotificationsAsync, saveUserToken, notifyUser } from '../utils/notifications';
import * as Notifications from 'expo-notifications';

// Notification Handler is configured in utils/notifications.js

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // The Firebase User
    const [userRole, setUserRole] = useState(null); // 'citizen', 'engineer', etc.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for Firebase Auth changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, fetch their Role from Firestore
                await fetchUserRole(firebaseUser.uid);
                setUser(firebaseUser);

                // WEB-SAFE TOKEN REGISTRATION
                setTimeout(async () => {
                    const token = await registerForPushNotificationsAsync();
                    if (token) {
                        try {
                            await saveUserToken(firebaseUser.uid, token);
                        } catch (err) {
                            console.log("Token save failed (minor):", err);
                        }
                    }
                }, 1000);

            } else {
                // User is signed out
                setUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // SEPARATE HEARTBEAT EFFECT
    useEffect(() => {
        if (!user) return;

        const updateHeartbeat = async () => {
            try {
                await setDoc(doc(db, 'users', user.uid), {
                    lastActive: Date.now()
                }, { merge: true });
            } catch (e) {
                console.log("Heartbeat failed", e);
            }
        };

        updateHeartbeat(); // Immediate
        const interval = setInterval(updateHeartbeat, 60000); // Every 1 minute

        return () => clearInterval(interval);
    }, [user]);

    const fetchUserRole = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserRole(docSnap.data().role);
            } else {
                // Fallback or error handling
                console.log("User exists in Auth but not in Firestore 'users' collection");
            }
        } catch (e) {
            console.error("Error fetching role:", e);
        }
    };

    const login = async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const registerCitizen = async (email, password, fullName, username, referralCode = '') => {
        let referredBy = null;

        // 1. Create Auth User FIRST (to get authenticated state)
        const response = await createUserWithEmailAndPassword(auth, email, password);
        const uid = response.user.uid;

        // 2. Generate New Referral Code
        const cleanName = fullName.replace(/[^a-zA-Z]/g, '').toUpperCase();
        const prefix = (cleanName.length >= 3 ? cleanName.substring(0, 3) : (cleanName + "XXX").substring(0, 3));
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const newReferralCode = `${prefix}${randomSuffix}`;

        // 3. Validate Username Uniqueness (Authenticated Check)
        // We do this AFTER auth creation so we have permission to query 'users'
        try {
            const qUsername = query(
                collection(db, 'users'),
                where('username', '==', username),
                limit(1)
            );
            const userSnap = await getDocs(qUsername);
            if (!userSnap.empty) {
                // Rollback: Delete the Auth User we just created
                await deleteUser(response.user);
                throw new Error("Username is already taken.");
            }
        } catch (error) {
            // If it was our specific error, rethrow. 
            // If it was a permission error (shouldn't happen now) or delete error, handle it.
            if (error.message === "Username is already taken.") throw error;

            // If standard error, try to cleanup anyway just in case
            try { await deleteUser(response.user); } catch (e) { }
            throw new Error("Registration failed during validation: " + error.message);
        }

        // 4. Process Referral Code (Now authenticated!)
        if (referralCode && referralCode.trim().length > 0) {
            try {
                // Now we are logged in as 'uid', we can query 'users' if rules allow "auth != null"
                const q = query(
                    collection(db, 'users'),
                    where('referralCode', '==', referralCode.toUpperCase().trim()),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    referredBy = snap.docs[0].id;
                    console.log(`User referred by: ${referredBy}`);
                }
            } catch (err) {
                console.warn("Referral check failed", err);
            }
        }

        // 4. Create Firestore Doc
        await setDoc(doc(db, 'users', uid), {
            email,
            name: fullName,
            username: username || '',
            role: 'citizen',
            createdAt: Date.now(),

            // New Fields
            balance: 0,
            reportCount: 0,
            referralCode: newReferralCode,
            referredBy: referredBy, // null or UID
            referralStatus: referredBy ? 'pending' : 'none' // 'pending', 'completed', 'none'
        });

        // 4b. Claim Username (Public Registry)
        // This allows the public check to work for future users
        if (username) {
            try {
                await setDoc(doc(db, 'usernames', username), { uid });
            } catch (e) {
                console.warn("Failed to claim username in registry:", e);
                // Non-critical for signup success, but important for consistency.
            }
        }

        // 5. Notify Referrer
        if (referredBy) {
            // Note: This might fail if we don't allow writing to other users' subcollections.
            // PROPER FIX: Use a Cloud Function trigger on 'users' creation to send this notification.
            // FOR NOW: We rely on permissive rules or this will silently fail in catch block of notifyUser.
            try {
                await notifyUser(referredBy, "New Referral!", `${fullName} just joined using your code! You're one step closer to £10.`);
            } catch (e) {
                console.log("Failed to notify referrer (permissions?):", e);
            }
        }

        setUserRole('citizen');
    };



    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserRole(null);
        } catch (error) {
            console.error("AuthContext: SignOut failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userRole,
            loading,
            login,
            registerCitizen,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};