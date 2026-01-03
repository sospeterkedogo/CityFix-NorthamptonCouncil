import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { registerForPushNotificationsAsync, saveUserToken } from '../utils/notifications';
import * as Notifications from 'expo-notifications';

// This controls what happens when a notification comes in
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true, // Show the banner (Pop-up)
        shouldPlaySound: true, // Play the "Ding"
        shouldSetBadge: false,
    }),
});

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

    const registerCitizen = async (email, password, fullName, username) => {
        const response = await createUserWithEmailAndPassword(auth, email, password);
        // Create the User Document in Firestore immediately
        await setDoc(doc(db, 'users', response.user.uid), {
            email,
            name: fullName,
            username: username || '', // Save username
            role: 'citizen',
            createdAt: Date.now()
        });
        setUserRole('citizen'); // Optimistic update
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