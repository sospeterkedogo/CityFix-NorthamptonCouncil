import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';

// 1. Configure Notification Handler (Visuals)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// 2. Register (kept for compatibility)
export async function registerForPushNotificationsAsync() {
    // Permission requests still needed for Local Notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        } catch (e) { console.log("Perm error", e) }
    }

    // Android Channel Setup for Sound
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: true, // Plays default sound
        });
    }

    // On Web, manually request browser permission so Alerts work
    if (Platform.OS === 'web' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    }

    return "virtual-token-active";
}

// 3. Save Token (No-op now)
export const saveUserToken = async (userId, token) => {
    // No-op
};

// 4. Send "Virtual Push" (Writes to Firestore)
export const sendAppNotification = async (userId, title, body, data = {}) => {
    if (!userId) return;
    try {
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            title,
            body,
            data,
            read: false,
            createdAt: serverTimestamp()
        });
        console.log(`Virtual Notification sent to ${userId}:`, title);
    } catch (e) {
        console.error("Error sending virtual notification:", e);
    }
}

export const sendPushNotification = async (token, title, body, data) => {
    // Deprecated for direct token send, but if used, we can't easily map token -> userId here.
    // Ideally we use notifyUser/notifyRole instead.
    console.log("Direct sendPushNotification called (Deprecated for Virtual Push)");
}

// 5. Notify by ID
export const notifyUser = async (userId, title, body) => {
    await sendAppNotification(userId, title, body);
};

// 6. Notify by Role
export const notifyRole = async (role, title, body) => {
    try {
        const q = query(collection(db, 'users'), where('role', '==', role));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            sendAppNotification(doc.id, title, body);
        });
        console.log(`Notified all ${role}s`);
    } catch (e) {
        console.error("Notify Role Error:", e);
    }
};

// 7. LISTEN HOOK (To be used in _layout.js)
export const useNotificationListener = (user) => {
    useEffect(() => {
        if (!user?.uid) return;

        console.log("Listening for notifications for:", user.uid);
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data();

                    // Trigger Local Notification
                    if (Platform.OS !== 'web') {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: notif.title,
                                body: notif.body,
                                data: notif.data,
                            },
                            trigger: null, // Instant
                        });
                    }

                    // Mark as read immediately
                    const docRef = doc(db, 'users', user.uid, 'notifications', change.doc.id);
                    await updateDoc(docRef, { read: true });
                }
            });
        });

        return () => unsubscribe();
    }, [user]);
};