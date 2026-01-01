import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createTicket, TICKET_STATUS } from '../constants/models';
import { canAssign } from '../constants/workflow';
import { notifyUser, notifyRole } from '../utils/notifications';
import { UserService } from './userService';
import { isPointInPolygon, getDistanceKm } from '../utils/geo';


const TICKET_COLLECTION = 'tickets';

// Helper to get a user's token
const getUserToken = async (userId) => {
  try {
    if (!userId) return null;
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? userSnap.data().pushToken : null;
  } catch (e) {
    console.error("Error fetching token:", e);
    return null;
  }
};

export const TicketService = {
  /**
   * Submits a new ticket to Firestore
   */
  submitTicket: async (userId, title, description, category, lat, lng, photos = []) => {
    try {
      // 1. Use the Factory Function to enforce structure
      const ticketData = createTicket(userId, title, description, category, lat, lng);

      // 2. Set status to SUBMITTED
      ticketData.status = TICKET_STATUS.SUBMITTED;

      // 3. Add photo URLs if any
      ticketData.photos = photos;

      // 4. Write to Firestore
      const docRef = await addDoc(collection(db, TICKET_COLLECTION), ticketData);

      // NOTIFICATION: Confirm to Citizen
      await notifyUser(userId, "Ticket Received", `We have received your report: "${title}".`);

      // NOTIFICATION: Alert Dispatchers
      await notifyRole('dispatcher', "New Report", `New ticket submitted: ${title}`);

      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
     * Fetches all tickets (Modified to hide Merged ones by default)
     */
  getAllTickets: async (includeMerged = false) => {
    try {
      const querySnapshot = await getDocs(collection(db, TICKET_COLLECTION));
      const allDocs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      if (includeMerged) return allDocs;

      // GRACEFUL HANDLING: Filter out merged tickets AND social posts
      return allDocs.filter(t => t.status !== 'merged' && t.type !== 'social');
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  },

  /**
   * Fetches engineer jobs (Modified to strictly hide Merged)
   */
  getEngineerJobs: async (engineerId) => {
    try {
      const q = query(
        collection(db, TICKET_COLLECTION),
        where("assignedTo", "==", engineerId)
      );

      const querySnapshot = await getDocs(q);

      const jobs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      // Engineer should NEVER see a merged ticket
      return jobs.filter(t => t.status !== 'merged');

    } catch (error) {
      console.error("Error fetching engineer jobs:", error);
      return [];
    }
  },

  /**
   * Get tickets for a specific citizen (Includes merged so they can see history)
   */
  getCitizenTickets: async (userId) => {
    try {
      const q = query(collection(db, TICKET_COLLECTION), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const allDocs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      return allDocs.filter(t => t.type !== 'social');
    } catch (e) {
      return [];
    }
  },

  /**
   * Assigns a ticket to an engineer and updates status
   */
  assignTicket: async (ticketId, engineerId) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);

      // 1. FETCH CURRENT STATE FIRST (Security Check)
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");

      const ticketData = ticketSnap.data();
      const currentStatus = ticketData.status;

      // 2. CHECK THE STATE MACHINE
      if (!canAssign(currentStatus)) {
        throw new Error(`Illegal Action: Cannot assign a ticket that is '${currentStatus}'.`);
      }

      // 3. If passed, update the ticket
      await updateDoc(ticketRef, {
        assignedTo: engineerId,
        status: TICKET_STATUS.ASSIGNED, // Move from SUBMITTED -> ASSIGNED
        updatedAt: Date.now()
      });

      // NOTIFICATION: To Engineer
      await notifyUser(engineerId, "New Job Assigned", `You are assigned to: ${ticketData.title}`);

      // NOTIFICATION: To Citizen
      await notifyUser(ticketData.userId, "Update: Engineer Assigned", `An engineer is on the way to fix your issue.`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Automatically assign ticket to the best engineer
   * 1. Check Zones (Polygon)
   * 2. Fallback to Nearest Distance
   */
  autoAssign: async (ticketId) => {
    try {
      // 1. Get Ticket
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticket = { ...ticketSnap.data(), id: ticketSnap.id };

      if (!canAssign(ticket.status)) throw new Error("Ticket cannot be assigned (already resolved/assigned).");

      // 2. Get All Engineers
      const engineers = await UserService.getAllEngineers();
      const availableEngineers = engineers.filter(e => e.status === 'Available');

      if (availableEngineers.length === 0) throw new Error("No available engineers found.");

      let bestEngineer = null;
      let minDist = Infinity;
      const { latitude, longitude } = ticket.location;

      // 3. Find Best Match
      for (const eng of availableEngineers) {
        // Priority A: Inside Zone
        if (eng.zone && isPointInPolygon({ latitude, longitude }, eng.zone)) {
          bestEngineer = eng;
          break; // Found one in zone!
        }

        // Priority B: Distance (Fallback)
        if (eng.lastKnownLocation) {
          const dist = getDistanceKm(latitude, longitude, eng.lastKnownLocation.latitude, eng.lastKnownLocation.longitude);
          if (dist < minDist) {
            minDist = dist;
            if (!bestEngineer) bestEngineer = eng;
          }
        }
      }

      // Fallback
      if (!bestEngineer) bestEngineer = availableEngineers[0];

      // 4. Assign
      return await TicketService.assignTicket(ticket.id, bestEngineer.id);

    } catch (e) {
      return { success: false, error: e.message };
    }
  },


  /**
   * Get a single ticket by ID
   */
  getTicketById: async (ticketId) => {
    try {
      const docRef = doc(db, TICKET_COLLECTION, ticketId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id };
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * RESOLVE the ticket with evidence
   */
  resolveTicket: async (ticketId, notes, afterPhotoUrl) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);

      const ticketSnap = await getDoc(ticketRef);
      const ticketData = ticketSnap.exists() ? ticketSnap.data() : {};

      await updateDoc(ticketRef, {
        status: TICKET_STATUS.RESOLVED,
        resolutionNotes: notes,
        afterPhoto: afterPhotoUrl, // The proof!
        resolvedAt: Date.now()
      });

      // CREATE NOTIFICATION (This is what triggers the Context listener)
      await addDoc(collection(db, 'users', ticketData.userId, 'notifications'), {
        title: "Issue Resolved",
        body: `Good news! "${ticketData.title}" has been fixed.`,
        read: false,
        createdAt: Date.now(),
        type: 'status_update',
        ticketId: ticketId
      });


      // NOTIFICATION: To Citizen
      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Issue Resolved!", `Good news! "${ticketData.title}" has been fixed.`);
      }

      // NOTIFICATION: To QA
      await notifyRole('qa', "Verification Needed", `Ticket #${ticketId.slice(0, 4)} is resolved. Please verify.`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Final Step: QA Verification
   */
  verifyTicket: async (ticketId) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      const ticketSnap = await getDoc(ticketRef);
      const ticketData = ticketSnap.exists() ? ticketSnap.data() : {};

      await updateDoc(ticketRef, {
        status: TICKET_STATUS.VERIFIED,
        verifiedAt: Date.now()
      });

      // NOTIFICATION: To Citizen
      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Case Closed", `Your report "${ticketData.title}" has been verified and closed.`);
      }

      // NOTIFICATION: To Engineer
      if (ticketData.assignedTo) {
        await notifyUser(ticketData.assignedTo, "Work Verified", `Great job! Your fix for "${ticketData.title}" has been verified.`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * REJECT/REOPEN a resolved ticket
   */
  reopenTicket: async (ticketId, reason) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);

      await updateDoc(ticketRef, {
        status: 'reopened', // This status will put it back in the Dispatcher's inbox!
        rejectionReason: reason,
        reopenedAt: Date.now(),
        // Optional: Clear the assignment so it can be re-assigned?
        // Or keep it assigned to the same engineer?
        // Let's keep it assigned but flagged.
      });

      // Fetch ticket to get users
      const ticketSnap = await getDoc(ticketRef);
      const ticketData = ticketSnap.data();

      // NOTIFICATION: To Engineer
      if (ticketData.assignedTo) {
        await notifyUser(ticketData.assignedTo, "Ticket Reopened", `Ticket "${ticketData.title}" was reopened. Reason: ${reason}`);
      }

      // NOTIFICATION: To Citizen
      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Status Update: Reopened", `Your ticket "${ticketData.title}" was reopened for further work.`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  /**
   * Mark ticket as Under Review (Dispatcher Action)
   */
  markAsUnderReview: async (ticketId) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      await updateDoc(ticketRef, {
        status: TICKET_STATUS.UNDER_REVIEW,
        updatedAt: Date.now()
      });

      const ticketSnap = await getDoc(ticketRef);
      const ticketData = ticketSnap.data();

      // NOTIFICATION: To Citizen
      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Under Review", `We are reviewing your report: "${ticketData.title}".`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Merges duplicate tickets into a parent ticket
   * @param {string} parentId - The ID of the ticket to keep
   * @param {string[]} duplicateIds - Array of IDs to close
   */
  mergeTickets: async (parentId, duplicateIds) => {
    try {
      const batch = writeBatch(db);

      duplicateIds.forEach(id => {
        const docRef = doc(db, TICKET_COLLECTION, id);
        batch.update(docRef, {
          status: 'merged', // New status
          mergedInto: parentId,
          resolutionNotes: `Closed as duplicate of #${parentId.slice(0, 5)}`,
          updatedAt: Date.now()
        });
      });

      await batch.commit();

      // OPTIONAL: Notify duplicate owners (async loop)
      // Since this is a batch, we might not want to await individually, but let's do it for completeness
      duplicateIds.forEach(async (id) => {
        const snap = await getDoc(doc(db, TICKET_COLLECTION, id));
        if (snap.exists()) {
          const d = snap.data();
          if (d.userId) {
            await notifyUser(d.userId, "Ticket Merged", `Your report "${d.title}" was merged into a similar report.`);
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Merge failed:", error);
      return { success: false, error: error.message };
    }
  },
};

