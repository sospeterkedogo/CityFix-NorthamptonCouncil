import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, deleteDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationService } from './notificationService';

const userCache = {};
const CACHE_DURATION = 5 * 60 * 1000;

export const UserService = {


  getUserCached: async (userId) => {
    const now = Date.now();


    if (userCache[userId] && (now - userCache[userId].timestamp < CACHE_DURATION)) {
      return userCache[userId].data;
    }


    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();

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

  sendRequest: async (fromUser, toUser) => {
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


  acceptRequest: async (requestId, fromId, toId, accepterName = 'Someone') => {

    await setDoc(doc(db, 'users', toId, 'neighbors', fromId), {
      since: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', toId), {
      neighborCount: increment(1)
    });


    await deleteDoc(doc(db, 'friend_requests', requestId));


    try {
      await setDoc(doc(db, 'users', fromId, 'neighbors', toId), {
        since: serverTimestamp()
      });

      await updateDoc(doc(db, 'users', fromId), {
        neighborCount: increment(1)
      });
    } catch (e) {
      console.warn("Could not add neighbor to sender's list (permissions?):", e);
    }


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


  declineRequest: async (requestId) => {
    await updateDoc(doc(db, 'friend_requests', requestId), {
      status: 'declined'
    });
  },


  listenToSentRequests: (userId, callback) => {
    const q = query(
      collection(db, 'friend_requests'),
      where('fromId', '==', userId)
    );
    return onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      requests.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      callback(requests);
    });
  },


  clearRequest: async (requestId) => {
    await deleteDoc(doc(db, 'friend_requests', requestId));
  },


  removeNeighbor: async (userId, neighborId, userName) => {

    await deleteDoc(doc(db, 'users', userId, 'neighbors', neighborId));

    await updateDoc(doc(db, 'users', userId), { neighborCount: increment(-1) });


    try {
      await deleteDoc(doc(db, 'users', neighborId, 'neighbors', userId));

      await updateDoc(doc(db, 'users', neighborId), { neighborCount: increment(-1) });
    } catch (e) {
      console.warn("Could not remove from neighbor's list (permissions?):", e);
    }


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

  listenToNeighbors: (userId, callback) => {
    return onSnapshot(collection(db, 'users', userId, 'neighbors'), async (snap) => {
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


  isUsernameUnique: async (username) => {
    try {

      const docRef = doc(db, 'usernames', username);
      const docSnap = await getDoc(docRef);
      return !docSnap.exists();
    } catch (error) {
      console.error("Error checking username uniqueness:", error);
      return true;
    }
  },


  updateStatus: async (userId, status, name = "Engineer") => {
    try {
      const userRef = doc(db, 'users', userId);


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