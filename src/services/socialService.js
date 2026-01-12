import { db } from '../config/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, limit, doc, getDoc, updateDoc, increment, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';

export const SocialService = {


    createPost: async (userId, userPhoto, userName, userEmail, content, imageUrl, location, type = 'image', address = null) => {
        try {
            const postData = {
                userId,
                userPhoto,
                userName,
                userEmail,
                content,
                imageUrl,
                location,
                address,
                type: 'social',
                mediaType: type,
                createdAt: serverTimestamp(),
                likes: 0,
                comments: 0,
                status: 'active'
            };

            const docRef = await addDoc(collection(db, 'tickets'), postData);


            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                postsCount: increment(1),
                lastActive: serverTimestamp()
            });

            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("Error creating post:", error);
            throw error;
        }
    },

    getNeighborhoodFeed: async (limitCount = 20) => {
        try {
            const q = query(
                collection(db, 'tickets'),
                where('type', '==', 'social'),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );

            const snapshot = await getDocs(q);


            const sanitizedData = snapshot.docs
                .map(doc => {
                    const item = { id: doc.id, ...doc.data() };
                    const hasBadBlob = (url) => url && typeof url === 'string' && url.startsWith('blob:');

                    if (hasBadBlob(item.imageUrl)) item.imageUrl = null;
                    if (hasBadBlob(item.afterPhoto)) item.afterPhoto = null;
                    if (item.photos && Array.isArray(item.photos)) {
                        item.photos = item.photos.filter(url => !hasBadBlob(url));
                    }
                    return item;
                });

            return {
                success: true,
                data: sanitizedData
            };
        } catch (error) {
            console.error("Error fetching feed:", error);
            return { success: false, data: [] };
        }
    },


    checkUserLiked: async (postId, userId) => {
        if (!userId) return false;
        try {
            const likeRef = doc(db, 'tickets', postId, 'likes', userId);
            const likeSnap = await getDoc(likeRef);
            return likeSnap.exists();
        } catch (error) {
            console.warn("Error checking like:", error);
            return false;
        }
    },


    checkUserUpvoted: async (postId, userId) => {
        if (!userId) return false;
        try {
            const voteRef = doc(db, 'tickets', postId, 'upvotes', userId);
            const voteSnap = await getDoc(voteRef);
            return voteSnap.exists();
        } catch (error) {
            console.warn("Error checking upvote:", error);
            return false;
        }
    },


    toggleLike: async (postId, userId) => {
        const likeRef = doc(db, 'tickets', postId, 'likes', userId);
        const postRef = doc(db, 'tickets', postId);
        const likeSnap = await getDoc(likeRef);

        if (likeSnap.exists()) {
            await deleteDoc(likeRef);
            await updateDoc(postRef, { likes: increment(-1) });
            return false;
        } else {
            await setDoc(likeRef, { createdAt: serverTimestamp() });
            await updateDoc(postRef, { likes: increment(1) });
            return true;
        }
    },


    toggleUpvote: async (postId, userId) => {
        const voteRef = doc(db, 'tickets', postId, 'upvotes', userId);
        const postRef = doc(db, 'tickets', postId);
        const voteSnap = await getDoc(voteRef);

        if (voteSnap.exists()) {
            await deleteDoc(voteRef);
            await updateDoc(postRef, { upvoteCount: increment(-1) });
            return false;
        } else {
            await setDoc(voteRef, { createdAt: serverTimestamp() });
            await updateDoc(postRef, { upvoteCount: increment(1) });
            return true;
        }
    },


    getComments: async (postId) => {
        try {
            const q = query(
                collection(db, 'tickets', postId, 'comments'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching comments:", error);
            return [];
        }
    },


    addComment: async (postId, userId, userName, text, userAvatar = null) => {
        try {
            await addDoc(collection(db, 'tickets', postId, 'comments'), {
                userId,
                userName,
                userAvatar,
                text,
                createdAt: Date.now(),
                isFlagged: false
            });

            const postRef = doc(db, 'tickets', postId);
            await updateDoc(postRef, { commentCount: increment(1) });
            return true;
        } catch (error) {
            console.error("Error adding comment:", error);
            throw error;
        }
    },


    deletePost: async (postId) => {
        try {
            await deleteDoc(doc(db, 'tickets', postId));
            return true;
        } catch (error) {
            console.error("Error deleting post:", error);
            throw error;
        }
    },


    getUserSocialPosts: async (userId) => {
        try {
            const q = query(
                collection(db, 'tickets'),
                where('userId', '==', userId),
                where('type', '==', 'social'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.warn("Error fetching user social posts:", error);
            return [];
        }
    },

    getUserActivity: async (userId) => {
        return [];
    }
};
