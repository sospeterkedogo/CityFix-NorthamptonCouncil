import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
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

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const notif = change.doc.data();
                    if (!notif.read) {
                        if (Platform.OS !== 'web') {
                            Notifications.scheduleNotificationAsync({
                                content: {
                                    title: notif.title,
                                    body: notif.body,
                                    data: notif.data,
                                },
                                trigger: null,
                            });
                        }
                        else {
                            if (Notification.permission === "granted") {
                                new Notification(notif.title, {
                                    body: notif.body,
                                    icon: '/icon.png'
                                });
                            }
                        }
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

    const deleteNotification = async (id) => {
        if (!user?.uid) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
