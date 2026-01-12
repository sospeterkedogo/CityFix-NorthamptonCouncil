import {
    collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const ChatService = {

    getRoomId: (uid1, uid2) => {
        // Sort IDs to ensure uniqueness regardless of who starts chat
        return [uid1, uid2].sort().join('_');
    },

    initializeRoom: async (uid1, uid2) => {
        const roomId = ChatService.getRoomId(uid1, uid2);
        const roomRef = doc(db, 'chats', roomId);


        await setDoc(roomRef, {
            participants: [uid1, uid2],
            updatedAt: serverTimestamp()
        }, { merge: true });

        return roomId;
    },

    sendMessage: async (roomId, senderId, text, recipientId, senderName) => {
        if (!text.trim()) return;


        await addDoc(collection(db, 'chats', roomId, 'messages'), {
            text,
            senderId,
            createdAt: serverTimestamp()
        });


        await updateDoc(doc(db, 'chats', roomId), {
            lastMessage: text,
            lastSenderId: senderId,
            updatedAt: serverTimestamp()
        });


        if (recipientId && senderName) {
            try {
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