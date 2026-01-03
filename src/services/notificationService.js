import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export const NotificationService = {
    /**
     * Send a notification to a specific user
     */
    sendNotification: async (userId, title, body, type = 'alert', data = {}) => {
        try {
            await addDoc(collection(db, 'users', userId, 'notifications'), {
                title,
                body,
                type,
                read: false,
                createdAt: serverTimestamp(),
                ...data
            });
            return { success: true };
        } catch (error) {
            console.error("Error sending notification:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Fetch user notifications
     */
    getNotifications: async (userId, limitCount = 50) => {
        try {
            const q = query(
                collection(db, 'users', userId, 'notifications'),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }
    },

    /**
     * Mark a notification as read
     */
    markAsRead: async (userId, notificationId) => {
        try {
            const docRef = doc(db, 'users', userId, 'notifications', notificationId);
            await updateDoc(docRef, {
                read: true
            });
            return { success: true };
        } catch (error) {
            console.error("Error marking notification as read:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a notification
     */
    deleteNotification: async (userId, notificationId) => {
        try {
            const docRef = doc(db, 'users', userId, 'notifications', notificationId);
            await deleteDoc(docRef);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
};
