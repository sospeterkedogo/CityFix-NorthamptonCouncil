import {
    collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const ChatService = {

    // 1. Generate a Consistent Room ID
    getRoomId: (uid1, uid2) => {
        // Sort IDs to ensure uniqueness regardless of who starts chat
        return [uid1, uid2].sort().join('_');
    },

    // 2. Initialize Room (if it doesn't exist)
    // We call this when opening the chat screen
    initializeRoom: async (uid1, uid2) => {
        const roomId = ChatService.getRoomId(uid1, uid2);
        const roomRef = doc(db, 'chats', roomId);

        // We use setDoc with { merge: true } so we don't overwrite existing history
        await setDoc(roomRef, {
            participants: [uid1, uid2],
            updatedAt: serverTimestamp()
        }, { merge: true });

        return roomId;
    },

    // 3. Send Message
    sendMessage: async (roomId, senderId, text, recipientId, senderName) => {
        if (!text.trim()) return;

        // A. Add message to subcollection
        await addDoc(collection(db, 'chats', roomId, 'messages'), {
            text,
            senderId,
            createdAt: serverTimestamp()
        });

        // B. Update top-level room info
        await updateDoc(doc(db, 'chats', roomId), {
            lastMessage: text,
            lastSenderId: senderId,
            updatedAt: serverTimestamp()
        });

        // C. Send Notification to Recipient
        if (recipientId && senderName) {
            try {
                // Import NotificationService dynamically to avoid circular dep if any (safe here though)
                const { NotificationService } = require('./notificationService');
                await NotificationService.sendNotification(
                    recipientId,
                    senderName,
                    text,
                    'chat',
                    { roomId, partnerId: senderId, name: senderName } // Data for deep link
                );
            } catch (e) {
                console.warn("Failed to notify recipient of new message", e);
            }
        }
    },

    // 4. Real-time Listener
    listenToMessages: (roomId, callback) => {
        const q = query(
            collection(db, 'chats', roomId, 'messages'),
            orderBy('createdAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            const messages = snapshot.docs.map(doc => ({
                _id: doc.id,
                createdAt: doc.data().createdAt?.toDate() || new Date(), // Handle latency
                text: doc.data().text,
                user: {
                    _id: doc.data().senderId,
                }
            }));
            callback(messages);
        });
    }
};