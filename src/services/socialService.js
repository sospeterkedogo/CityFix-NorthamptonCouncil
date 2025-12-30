import {
    collection, getDocs, query, where, orderBy, limit, startAfter,
    doc, updateDoc, increment, addDoc, getDoc, setDoc, deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const TICKETS_COL = 'tickets';

export const SocialService = {

    // 1. Fetch Verified Feed (Infinite Scroll)
    getVerifiedFeed: async (lastSnapshot = null, pageSize = 5) => {
        try {
            console.log("Fetching verified feed...");
            // Create the base query
            let q = query(
                collection(db, TICKETS_COL),
                where('status', '==', 'verified'), // Only show verified fixes
                orderBy('createdAt', 'desc'), // Requires index: check console for link if this fails
                limit(pageSize)
            );

            if (lastSnapshot) {
                q = query(q, startAfter(lastSnapshot));
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log("No strictly verified items found. Checking sample docs...");
                // Debug: Fetch any 5 docs to see what their status is
                try {
                    const sampleQ = query(collection(db, TICKETS_COL), limit(5));
                    const sampleSnap = await getDocs(sampleQ);
                    const sampleStatuses = sampleSnap.docs.map(d => `${d.id.substring(0, 4)}...: ${d.data().status}`);
                    console.log("Sample statuses:", sampleStatuses);

                    return {
                        data: [],
                        lastVisible: null,
                        debugInfo: `No 'verified' tickets found.\nSample DB statuses:\n${sampleStatuses.join('\n')}`
                    };
                } catch (err) {
                    return { data: [], lastVisible: null, debugInfo: `Error fetching samples: ${err.message}` };
                }
            }

            console.log(`Found ${snapshot.docs.length} verified items.`);

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

        try {
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
                return true; // Liked
            }
        } catch (e) {
            console.error(e);
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

        try {
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
                return true;
            }
        } catch (e) {
            console.error(e);
        }
    },

    checkUserUpvoted: async (ticketId, userId) => {
        const upvoteSnap = await getDoc(doc(db, TICKETS_COL, ticketId, 'upvotes', userId));
        return upvoteSnap.exists();
    },

    // 4. Comments
    addComment: async (ticketId, userId, userName, text) => {
        await addDoc(collection(db, TICKETS_COL, ticketId, 'comments'), {
            userId, userName, text,
            createdAt: Date.now(),
            isFlagged: false
        });
        // Increment comment count on the ticket
        await updateDoc(doc(db, TICKETS_COL, ticketId), {
            commentCount: increment(1)
        });
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
    }
};