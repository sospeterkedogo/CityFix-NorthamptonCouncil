import {
    collection, getDocs, query, where, orderBy, limit, startAfter,
    doc, updateDoc, increment, addDoc, getDoc, setDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import * as Location from 'expo-location';
import { notifyUser } from '../utils/notifications';

const TICKETS_COL = 'tickets';

export const SocialService = {

    // 1. Fetch Live Feed (Active, Verified, Resolved)
    getVerifiedFeed: async (lastSnapshot = null, pageSize = 5) => {
        try {
            console.log("Fetching live feed...");
            // Create the base query
            let q = query(
                collection(db, TICKETS_COL),
                where('status', 'in', ['in_progress', 'verified', 'resolved']), // Live Feed Strategy
                orderBy('createdAt', 'desc'),
                limit(pageSize)
            );

            if (lastSnapshot) {
                q = query(q, startAfter(lastSnapshot));
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log("No live feed items found. Checking sample docs...");
                // Debug: Fetch any 5 docs to see what their status is
                try {
                    const sampleQ = query(collection(db, TICKETS_COL), limit(5));
                    const sampleSnap = await getDocs(sampleQ);
                    const sampleStatuses = sampleSnap.docs.map(d => `${d.id.substring(0, 4)}...: ${d.data().status}`);
                    console.log("Sample statuses:", sampleStatuses);

                    return {
                        data: [],
                        lastVisible: null,
                        debugInfo: `No active/completed tickets found.\nSample DB statuses:\n${sampleStatuses.join('\n')}`
                    };
                } catch (err) {
                    return { data: [], lastVisible: null, debugInfo: `Error fetching samples: ${err.message}` };
                }
            }

            console.log(`Found ${snapshot.docs.length} live feed items.`);

            // FIX: Put `doc.data()` FIRST, then `id: doc.id` to ensure ID isn't overwritten
            // Also ensure we handle missing verifiedAt if we want to sort later
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];

            return { data, lastVisible, debugInfo: null };
        } catch (error) {
            console.error("Error fetching feed:", error);
            return { data: [], lastVisible: null, debugInfo: `Error: ${error.message}` };
        }
    },

    // 2. Toggle Like (Upvote)
    toggleLike: async (ticketId, userId) => {
        const likeRef = doc(db, TICKETS_COL, ticketId, 'likes', userId);
        const ticketRef = doc(db, TICKETS_COL, ticketId);

        // Remove try-catch to allow component to handle errors
        const likeSnap = await getDoc(likeRef);

        if (likeSnap.exists()) {
            // Unlike
            await deleteDoc(likeRef);
            await updateDoc(ticketRef, { voteCount: increment(-1) });
            return false; // Not liked
        } else {
            // Like
            await setDoc(likeRef, { createdAt: Date.now() });
            await updateDoc(ticketRef, { voteCount: increment(1) });

            // LOG ACTIVITY
            await SocialService.logUserActivity(userId, 'like', ticketId, { type: 'social' });

            // NOTIFICATION: Notify Post Owner (if not self)
            try {
                const ticketSnap = await getDoc(ticketRef);
                if (ticketSnap.exists()) {
                    const post = ticketSnap.data();
                    if (post.userId && post.userId !== userId) {
                        // We need sender name - but we don't have it here easily without fetching sender
                        // We can just say "Someone" or pass it in. Ideally pass it in.
                        // For MVP, just "A neighbor".
                        await NotificationService.sendNotification(
                            post.userId,
                            "New Like",
                            `A neighbor liked your post: "${post.title || '...'}"`,
                            'social',
                            { postId: ticketId }
                        );
                    }
                }
            } catch (e) {
                console.warn("Error sending like notification:", e);
            }

            return true; // Liked
        }
    },

    // 3. Check if user liked (for UI color)
    checkUserLiked: async (ticketId, userId) => {
        const likeSnap = await getDoc(doc(db, TICKETS_COL, ticketId, 'likes', userId));
        return likeSnap.exists();
    },

    // 4. Upvotes (Separate from Likes)
    toggleUpvote: async (ticketId, userId) => {
        const upvoteRef = doc(db, TICKETS_COL, ticketId, 'upvotes', userId);
        const ticketRef = doc(db, TICKETS_COL, ticketId);

        // Remove try-catch to allow component to handle errors
        const upvoteSnap = await getDoc(upvoteRef);

        if (upvoteSnap.exists()) {
            // Remove Upvote
            await deleteDoc(upvoteRef);
            await updateDoc(ticketRef, { upvoteCount: increment(-1) });
            return false;
        } else {
            // Add Upvote
            await setDoc(upvoteRef, { createdAt: Date.now() });
            await updateDoc(ticketRef, { upvoteCount: increment(1) });

            // LOG ACTIVITY
            await SocialService.logUserActivity(userId, 'upvote', ticketId, { type: 'report' });

            // NOTIFICATION: Notify Reporter (if not self)
            try {
                const ticketSnap = await getDoc(ticketRef);
                if (ticketSnap.exists()) {
                    const ticket = ticketSnap.data();
                    if (ticket.userId && ticket.userId !== userId) {
                        await NotificationService.sendNotification(
                            ticket.userId,
                            "New Upvote",
                            `A neighbor upvoted your report: "${ticket.title || '...'}"`,
                            'social',
                            { ticketId: ticketId }
                        );
                    }
                }
            } catch (e) {
                console.warn("Error sending upvote notification:", e);
            }

            return true;
        }
    },

    checkUserUpvoted: async (ticketId, userId) => {
        const upvoteSnap = await getDoc(doc(db, TICKETS_COL, ticketId, 'upvotes', userId));
        return upvoteSnap.exists();
    },

    // 4. Comments
    addComment: async (ticketId, userId, userName, text, userAvatar = null) => {
        await addDoc(collection(db, TICKETS_COL, ticketId, 'comments'), {
            userId, userName, text, userAvatar,
            createdAt: Date.now(),
            isFlagged: false
        });
        // Increment comment count on the ticket
        await updateDoc(doc(db, TICKETS_COL, ticketId), {
            commentCount: increment(1)
        });

        // LOG ACTIVITY
        await SocialService.logUserActivity(userId, 'comment', ticketId, { text });
    },

    getComments: async (ticketId) => {
        const q = query(
            collection(db, TICKETS_COL, ticketId, 'comments'),
            orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    // 5. Moderation (Flagging)
    flagComment: async (ticketId, commentId) => {
        await updateDoc(doc(db, TICKETS_COL, ticketId, 'comments', commentId), {
            isFlagged: true
        });
    },

    // 1. NEW: Fetch Neighborhood Feed (User Posts)
    getNeighborhoodFeed: async (lastSnapshot = null, pageSize = 5) => {
        let q = query(
            collection(db, TICKETS_COL),
            where('type', '==', 'social'), // Only user posts
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );
        if (lastSnapshot) q = query(q, startAfter(lastSnapshot));

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        return { data, lastVisible };
    },

    // 2. NEW: Create a Social Post
    createPost: async (userId, userAvatar, userName, userEmail, text, photoUrl, locationCoords, mediaType = 'image', manualAddress = null) => {
        let streetName = "Unknown Location selected";

        try {
            if (manualAddress) {
                streetName = manualAddress;
            } else if (locationCoords && locationCoords.latitude && locationCoords.longitude) {
                const reverseGeocode = await Location.reverseGeocodeAsync({
                    latitude: locationCoords.latitude,
                    longitude: locationCoords.longitude
                });

                if (reverseGeocode && reverseGeocode.length > 0) {
                    const place = reverseGeocode[0];
                    // Construct a robust address
                    // e.g., "123 Main St, Springfield" or just "Main St"
                    const parts = [];
                    if (place.streetNumber) parts.push(place.streetNumber);
                    if (place.street) parts.push(place.street);
                    if (place.city) parts.push(place.city);

                    if (parts.length > 0) {
                        streetName = parts.join(' ');
                    } else if (place.name) {
                        streetName = place.name;
                    }
                }
            }
        } catch (error) {
            console.log("Reverse geocoding failed:", error);
            streetName = `Near ${locationCoords.latitude.toFixed(4)}, ${locationCoords.longitude.toFixed(4)}`;
        }

        // B. Save to DB
        await addDoc(collection(db, TICKETS_COL), {
            userId,
            userAvatar,
            userName,
            userEmail,
            title: text,
            location: locationCoords,
            locationName: streetName,
            photos: [photoUrl],
            mediaType,
            type: 'social',
            status: 'live',
            createdAt: Date.now(),
            voteCount: 0,
            commentCount: 0
        });

        // NOTIFICATION: Confirm Post
        await notifyUser(userId, "Post Published", "Your community post is now live at " + streetName);

        // NOTIFICATION: Broadcast to Neighbors
        try {
            const neighborsSnap = await getDocs(collection(db, 'users', userId, 'neighbors'));
            const neighbors = neighborsSnap.docs.map(d => d.id);

            // In a real app, use a Cloud Function for fan-out. For MVP, loop here.
            for (const neighborId of neighbors) {
                await notifyUser(neighborId, `New Post from ${userName}`, text);
            }
        } catch (e) {
            console.warn("Error broadcasting post notification:", e);
        }
    },

    // 3. NEW: Fetch Specific User's Social Posts
    getUserSocialPosts: async (userId) => {
        const q = query(
            collection(db, TICKETS_COL),
            where('type', '==', 'social'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // 4. NEW: Delete Post
    deletePost: async (postId) => {
        await deleteDoc(doc(db, TICKETS_COL, postId));
    },

    // 5. NEW: Log User Activity
    logUserActivity: async (userId, activityType, relatedId, metadata = {}) => {
        try {
            await addDoc(collection(db, 'users', userId, 'recent_activity'), {
                type: activityType, // 'like', 'comment', 'upvote', 'post'
                relatedId: relatedId,
                metadata: metadata,
                createdAt: Date.now()
            });
        } catch (e) {
            console.warn("Failed to log activity:", e);
        }
    },

    // 6. NEW: Fetch User Activity
    getUserActivity: async (userId) => {
        try {
            const q = query(
                collection(db, 'users', userId, 'recent_activity'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data(), isActivity: true }));
        } catch (e) {
            console.warn("Error fetching activity:", e);
            return [];
        }
    }
};