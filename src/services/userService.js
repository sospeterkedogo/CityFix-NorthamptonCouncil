import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';

const userCache = {}; // { userId: { data: {}, timestamp: 12345 } }
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const UserService = {

  // Get User (Cached) to prevent N+1 reads in Feed
  getUserCached: async (userId) => {
    const now = Date.now();

    // Check Cache
    if (userCache[userId] && (now - userCache[userId].timestamp < CACHE_DURATION)) {
      return userCache[userId].data;
    }

    // Fetch from Firestore
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        // Update Cache
        userCache[userId] = {
          data: userData,
          timestamp: now
        };
        return userData;
      }
    } catch (e) {
      console.warn("Cached fetch failed:", e);
    }
    return null;
  },

  // Search Users by Username (Prefix Search)
  searchUsers: async (searchTerm) => {
    // ... existing search logic ... //
    if (!searchTerm) return [];

    // 'searchTerm + \uf8ff' is a Firestore trick to simulate "Starts With"
    const q = query(
      collection(db, 'users'),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff')
    );

    try {
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error("Search Error:", error);
      return [];
    }
  },

  // Send Neighbor Request
  sendRequest: async (fromUser, toUser) => {
    // Check if request already exists
    const q = query(
      collection(db, 'friend_requests'),
      where('fromId', '==', fromUser.uid),
      where('toId', '==', toUser.id)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return { success: false, error: "Request already sent" };

    await addDoc(collection(db, 'friend_requests'), {
      fromId: fromUser.uid,
      fromName: fromUser.name || fromUser.displayName || fromUser.email,
      toId: toUser.id,
      toName: toUser.name || toUser.displayName || toUser.email,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    // Notify Recipient (Safe)
    const senderName = fromUser.name || fromUser.displayName || fromUser.email.split('@')[0] || 'Someone';
    try {
      await NotificationService.sendNotification(
        toUser.id,
        'New Friend Request',
        `${senderName} sent you a friend request.`,
        'request',
        { fromId: fromUser.uid }
      );
    } catch (e) {
      console.warn("Could not notify recipient (permissions?):", e);
    }

    // Notify Sender (Confirmation)
    try {
      await NotificationService.sendNotification(
        fromUser.uid,
        'Request Sent',
        `Friend request sent to ${toUser.name || toUser.username || toUser.email}.`,
        'system'
      );
    } catch (e) {
      console.warn("Could not notify sender:", e);
    }

    return { success: true };
  },

  // Listen for Incoming Requests (Real-time)
  listenToRequests: (userId, callback) => {
    const q = query(
      collection(db, 'friend_requests'),
      where('toId', '==', userId),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(requests);
    });
  },

  // Accept Request
  acceptRequest: async (requestId, fromId, toId, accepterName = 'Someone') => {
    // Create Friend Record for User 1 (Self)
    await setDoc(doc(db, 'users', toId, 'neighbors', fromId), {
      since: serverTimestamp()
    });

    // Update the request status to 'accepted' then delete
    await deleteDoc(doc(db, 'friend_requests', requestId));

    // Create Friend Record for User 2 (Sender)
    try {
      await setDoc(doc(db, 'users', fromId, 'neighbors', toId), {
        since: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not add neighbor to sender's list (permissions?):", e);
    }

    // Notify Original Sender (User 1)
    try {
      await NotificationService.sendNotification(
        fromId,
        'Request Accepted',
        `${accepterName} accepted your friend request!`,
        'success'
      );
    } catch (e) {
      console.warn("Could not notify sender (permissions?):", e);
    }

    // Notify Accepter (User 2 - Self)
    try {
      await NotificationService.sendNotification(
        toId,
        'You accepted a request',
        'You are now connected.',
        'system'
      );
    } catch (e) {
      console.warn("Could not notify accepter:", e);
    }
  },

  // Decline Request
  declineRequest: async (requestId) => {
    await updateDoc(doc(db, 'friend_requests', requestId), {
      status: 'declined'
    });
  },

  // Listen for Sent Requests (monitoring outgoing)
  listenToSentRequests: (userId, callback) => {
    const q = query(
      collection(db, 'friend_requests'),
      where('fromId', '==', userId)
    );
    return onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by status manually if needed, or createdAt descending
      requests.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      callback(requests);
    });
  },

  // Clear (Delete) Request
  clearRequest: async (requestId) => {
    await deleteDoc(doc(db, 'friend_requests', requestId));
  },

  // Remove Neighbor
  removeNeighbor: async (userId, neighborId, userName) => {
    // Remove from My Neighbors
    await deleteDoc(doc(db, 'users', userId, 'neighbors', neighborId));

    // Remove from Their Neighbors (Best Effort)
    try {
      await deleteDoc(doc(db, 'users', neighborId, 'neighbors', userId));
    } catch (e) {
      console.warn("Could not remove from neighbor's list (permissions?):", e);
    }

    // Notify them
    try {
      await NotificationService.sendNotification(
        neighborId,
        'Neighbor Removed',
        `${userName} has removed you as a neighbor.`,
        'system'
      );
    } catch (e) {
      console.warn("Could not notify neighbor:", e);
    }
  },

  // Get My Neighbors
  listenToNeighbors: (userId, callback) => {
    // This is a subcollection listener
    return onSnapshot(collection(db, 'users', userId, 'neighbors'), async (snap) => {
      // Fetch user details for each ID
      // Note: In a real app, you'd duplicate the name/avatar into the 'neighbors' doc 
      // to avoid these N+1 reads. For MVP, we fetch.
      const neighbors = [];
      for (const d of snap.docs) {
        const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', d.id)));
        if (!userSnap.empty) {
          neighbors.push({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
        }
      }
      callback(neighbors);
    });
  },

  /**
   * Check if a username is unique
   */
  isUsernameUnique: async (username) => {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username));
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error) {
      console.error("Error checking username uniqueness:", error);
      return false; // Fail safe
    }
  },

  /**
   * Updates the engineer's availability status
   */
  updateStatus: async (userId, status, name = "Engineer") => {
    try {
      const userRef = doc(db, 'users', userId);

      // We use setDoc with merge: true so if the user doesn't exist, it creates them
      await setDoc(userRef, {
        name: name,
        status: status,
        lastActive: Date.now()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error("Error updating status:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current status
   */
  getEngineerProfile: async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return { status: 'Available' }; // Default
      }
    } catch (error) {
      return { status: 'Available' };
    }
  },

  /**
   * Fetch all users with role 'engineer'
   */
  getAllEngineers: async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'engineer'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    } catch (error) {
      console.error("Error fetching engineers:", error);
      return [];
    }
  },

  /**
   * Update generic user profile (name, photo)
   */
  updateUserProfile: async (userId, data) => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...data,
        updatedAt: Date.now()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error("Error updating profile:", error);
      return { success: false, error: error.message };
    }
  }
};