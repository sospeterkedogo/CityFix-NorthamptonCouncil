import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

const SocialBadgeContext = createContext();

export const useSocialBadge = () => useContext(SocialBadgeContext);

export const SocialBadgeProvider = ({ children }) => {
    const { user } = useAuth();
    const [socialBadgeCount, setSocialBadgeCount] = useState(0);

    useEffect(() => {
        if (!user) {
            setSocialBadgeCount(0);
            return;
        }

        // Listen for Pending Friend Requests
        const qRequests = query(
            collection(db, 'friend_requests'),
            where('toId', '==', user.uid),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(qRequests, (snapshot) => {
            // For MVP, just counting pending requests. 
            // If we want unread chats, we'd need another listener or a 'chats' field.
            setSocialBadgeCount(snapshot.size);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <SocialBadgeContext.Provider value={{ socialBadgeCount }}>
            {children}
        </SocialBadgeContext.Provider>
    );
};
