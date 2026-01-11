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
    const [userData, setUserData] = useState(null); // The Firestore User Document
    const [userRole, setUserRole] = useState(null); // 'citizen', 'engineer', etc.
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen for Firebase Auth changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in, fetch their Role from Firestore
                await fetchUserProfile(firebaseUser.uid);
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
                setUserData(null);
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

    const fetchUserProfile = async (uid) => {
        try {
            const docRef = doc(db, 'users', uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setUserRole(data.role);
            } else {
                // Fallback or error handling
                console.log("User exists in Auth but not in Firestore 'users' collection");
            }
        } catch (e) {
            console.error("Error fetching user profile:", e);
        }
    };

    const login = async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const registerCitizen = async (email, password, fullName, username) => {


        // 4. Create Firestore Doc
        await setDoc(doc(db, 'users', uid), {
            email,
            name: fullName,
            username: username || '',
            role: 'citizen',
            createdAt: Date.now(),

            // New Fields
            balance: 0,
            reportCount: 0
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



        setUserRole('citizen');
    };



    const logout = async () => {
        try {
            // Set Last Active to past to show "Offline" immediately
            if (auth.currentUser) {
                try {
                    await setDoc(doc(db, 'users', auth.currentUser.uid), {
                        lastActive: Date.now() - 600000 // 10 mins ago
                    }, { merge: true });
                } catch (e) {
                    console.log("Failed to set offline status", e);
                }
            }

            await signOut(auth);
            setUser(null);
            setUserData(null);
            setUserRole(null);
        } catch (error) {
            console.error("AuthContext: SignOut failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData, // Expose full Firestore profile
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