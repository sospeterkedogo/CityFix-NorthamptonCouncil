import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// 1. Configure Notification Handler (Visuals)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// 2. Get Token (Web Compatible)
export async function registerForPushNotificationsAsync() {
    let token;

    // Web-Specific Setup
    if (Platform.OS === 'web') {
        // On web, we check permissions differently
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                console.log('Web Notification permission denied');
                return null;
            }
        } catch (e) {
            console.log("Web Push not supported in this browser context:", e);
            return null;
        }
    } else {
        // Android/iOS Setup
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return null;
            }
        }
    }

    // Get the token safely
    try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData.data;
        console.log("🔔 Token:", token);
    } catch (e) {
        console.log("Error fetching token (Expected on some simulators/browsers):", e);
    }

    return token;
}

// 3. Save Token Helper
export const saveUserToken = async (userId, token) => {
    if (!userId || !token) return;
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { pushToken: token });
    } catch (e) {
        // Ignore errors if user doc doesn't exist yet
    }
};

// 4. Send Notification (The Postman)
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
    if (!expoPushToken) return;

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
    };

    try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        const result = await response.json();
        console.log("🔔 Push Notification Result:", result);
    } catch (error) {
        console.error("Push Error:", error);
    }
};

// 5. Notify by ID
export const notifyUser = async (userId, title, body) => {
    if (!userId) return;
    try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
            const token = userSnap.data().pushToken;
            if (token) await sendPushNotification(token, title, body);
        }
    } catch (e) {
        console.error("Notify User Error:", e);
    }
};

// 6. Notify by Role
export const notifyRole = async (role, title, body) => {
    try {
        const q = query(collection(db, 'users'), where('role', '==', role));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => {
            const token = doc.data().pushToken;
            if (token) sendPushNotification(token, title, body);
        });
    } catch (e) {
        console.error("Notify Role Error:", e);
    }
};