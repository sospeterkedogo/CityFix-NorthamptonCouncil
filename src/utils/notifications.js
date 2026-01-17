import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';

if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });
}

export async function registerForPushNotificationsAsync() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        } catch (e) { /* silent catch */ }
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: true,
        });
    }

    if (Platform.OS === 'web' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    }

    return "virtual-token-active";
}

export const saveUserToken = async (userId, token) => {
};

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
        // Log removed
    } catch (e) {
        console.error("Error sending virtual notification:", e);
    }
}

export const sendPushNotification = async (token, title, body, data) => {
}

export const notifyUser = async (userId, title, body) => {
    await sendAppNotification(userId, title, body);
};
export const notifyRole = async (role, title, body) => {
    try {
        const q = query(collection(db, 'users'), where('role', '==', role));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            sendAppNotification(doc.id, title, body);
        });
        // Log removed
    } catch (e) {
        console.error("Notify Role Error:", e);
    }
};

export const useNotificationListener = (user) => {
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            where('read', '==', false)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data();

                    if (Platform.OS !== 'web') {
                        await Notifications.scheduleNotificationAsync({
                            content: {
                                title: notif.title,
                                body: notif.body,
                                data: notif.data,
                            },
                            trigger: null,
                        });
                    }

                    const docRef = doc(db, 'users', user.uid, 'notifications', change.doc.id);
                    await updateDoc(docRef, { read: true });
                }
            });
        });

        return () => unsubscribe();
    }, [user]);
};