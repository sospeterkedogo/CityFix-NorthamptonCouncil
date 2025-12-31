import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import * as Notifications from 'expo-notifications';

const NotificationContext = createContext();

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        // Subscribe to notifications collection
        // Order by createdAt desc (newest first)
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = [];
            let count = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                msgs.push({ id: doc.id, ...data });
                if (!data.read) count++;
            });

            setNotifications(msgs);
            setUnreadCount(count);
            setLoading(false);

            // Trigger Local Notification for NEW items (Optimistic check)
            // In a real robust app, we'd diff 'msgs' vs 'previousMsgs' to find new ones.
            // For now, relies on the separate listener in utils OR we can move it here.
            // Since we are replacing the utils hook, let's process "Added" changes here for Alerting.

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    // Only alert if it's reasonably new (to avoid alerting for old stuff on reload)
                    // Here we just alert everything coming in as "added" on the stream if it's unread
                    const notif = change.doc.data();
                    if (!notif.read && Platform.OS !== 'web') {
                        Notifications.scheduleNotificationAsync({
                            content: {
                                title: notif.title,
                                body: notif.body,
                                data: notif.data,
                            },
                            trigger: null,
                        });
                    }
                }
            });

        }, (error) => {
            console.error("Notification Listener Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (id) => {
        if (!user?.uid) return;
        try {
            const docRef = doc(db, 'users', user.uid, 'notifications', id);
            await updateDoc(docRef, { read: true });
        } catch (error) {
            console.error("Error marking read:", error);
        }
    };

    const markAllAsRead = async () => {
        if (!user?.uid) return;
        try {
            const batch = writeBatch(db);
            notifications.forEach((n) => {
                if (!n.read) {
                    const docRef = doc(db, 'users', user.uid, 'notifications', n.id);
                    batch.update(docRef, { read: true });
                }
            });
            await batch.commit();
        } catch (error) {
            console.error("Error marking all read:", error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
