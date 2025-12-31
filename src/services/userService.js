import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export const UserService = {
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