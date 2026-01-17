import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc, writeBatch, runTransaction, increment, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createTicket, TICKET_STATUS } from '../constants/models';
import { canAssign, canTransitionTo } from '../constants/workflow';
import { notifyUser, notifyRole } from '../utils/notifications';
import { UserService } from './userService';
import { isPointInPolygon, getDistanceKm } from '../utils/geo';


const TICKET_COLLECTION = 'tickets';

export const TicketService = {
  // Submit a new ticket
  submitTicket: async (userId, title, description, category, lat, lng, photos = [], address = null) => {
    try {
      // Create the ticket data
      const ticketData = createTicket(userId, title, description, category, lat, lng, address);
      ticketData.status = TICKET_STATUS.SUBMITTED;
      ticketData.photos = photos;
      // Submit the ticket to the database
      const docRef = await addDoc(collection(db, TICKET_COLLECTION), ticketData);
      // Notify the user and dispatcher
      await notifyUser(userId, "Ticket Received", `We have received your report: "${title}".`);
      await notifyRole('dispatcher', "New Report", `New ticket submitted: ${title}`);

      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },




  getAllTickets: async (includeMerged = false) => {
    try {
      const querySnapshot = await getDocs(collection(db, TICKET_COLLECTION));
      const allDocs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      if (includeMerged) return allDocs;


      return allDocs.filter(t => t.status !== 'merged' && t.type !== 'social');
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  },

  getResolvedTickets: async (limitCount = 20) => {
    try {
      const q = query(
        collection(db, TICKET_COLLECTION),
        where('status', 'in', ['resolved', 'verified']),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const allDocs = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));

      return allDocs.filter(t => t.type !== 'social').sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  },


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


      return jobs.filter(t => t.status !== 'merged');

    } catch (error) {
      console.error("Error fetching engineer jobs:", error);
      return [];
    }
  },


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


  assignTicket: async (ticketId, engineerId) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);


      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");

      const ticketData = ticketSnap.data();
      const currentStatus = ticketData.status;


      if (!canAssign(currentStatus)) {
        throw new Error(`Illegal Action: Cannot assign a ticket that is '${currentStatus}'.`);
      }


      await updateDoc(ticketRef, {
        assignedTo: engineerId,
        status: TICKET_STATUS.ASSIGNED,
        updatedAt: Date.now()
      });


      await notifyUser(engineerId, "New Job Assigned", `You are assigned to: ${ticketData.title}`);


      await notifyUser(ticketData.userId, "Update: Engineer Assigned", `An engineer is on the way to fix your issue.`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },


  autoAssign: async (ticketId) => {
    try {

      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticket = { ...ticketSnap.data(), id: ticketSnap.id };

      if (!canAssign(ticket.status)) throw new Error("Ticket cannot be assigned (already resolved/assigned).");


      const engineers = await UserService.getAllEngineers();
      const availableEngineers = engineers.filter(e => e.status === 'Available');

      if (availableEngineers.length === 0) throw new Error("No available engineers found.");

      let bestEngineer = null;
      let minDist = Infinity;
      const { latitude, longitude } = ticket.location;


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


      if (!bestEngineer) bestEngineer = availableEngineers[0];


      return await TicketService.assignTicket(ticket.id, bestEngineer.id);

    } catch (e) {
      return { success: false, error: e.message };
    }
  },



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


  resolveTicket: async (ticketId, notes, afterPhotoUrl) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);

      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticketData = ticketSnap.data();

      // Check workflow
      if (!canTransitionTo(ticketData.status, TICKET_STATUS.RESOLVED)) {
        throw new Error(`Illegal State Transition: Cannot move from '${ticketData.status}' to '${TICKET_STATUS.RESOLVED}'`);
      }

      await updateDoc(ticketRef, {
        status: TICKET_STATUS.RESOLVED,
        resolutionNotes: notes,
        afterPhoto: afterPhotoUrl,
        resolvedAt: Date.now()
      });


      await addDoc(collection(db, 'users', ticketData.userId, 'notifications'), {
        title: "Issue Resolved",
        body: `Good news! "${ticketData.title}" has been fixed.`,
        read: false,
        createdAt: Date.now(),
        type: 'status_update',
        ticketId: ticketId
      });



      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Issue Resolved!", `Good news! "${ticketData.title}" has been fixed.`);
      }


      await notifyRole('qa', "Verification Needed", `Ticket #${ticketId.slice(0, 4)} is resolved. Please verify.`);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },


  verifyTicket: async (ticketId) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticketData = ticketSnap.data();

      // Check workflow
      if (!canTransitionTo(ticketData.status, TICKET_STATUS.VERIFIED)) {
        throw new Error(`Illegal State Transition: Cannot move from '${ticketData.status}' to '${TICKET_STATUS.VERIFIED}'`);
      }

      await updateDoc(ticketRef, {
        status: TICKET_STATUS.VERIFIED,
        verifiedAt: Date.now()
      });


      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Case Closed", `Your report "${ticketData.title}" has been verified and closed.`);
      }


      if (ticketData.assignedTo) {
        await notifyUser(ticketData.assignedTo, "Work Verified", `Great job! Your fix for "${ticketData.title}" has been verified.`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },


  reopenTicket: async (ticketId, reason) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticketData = ticketSnap.data();

      // Check workflow (Note: 'reopened' is a valid status string in workflow.js)
      if (!canTransitionTo(ticketData.status, 'reopened')) {
        throw new Error(`Illegal State Transition: Cannot move from '${ticketData.status}' to 'reopened'`);
      }

      await updateDoc(ticketRef, {
        status: 'reopened',
        rejectionReason: reason,
        reopenedAt: Date.now(),

      });





      if (ticketData.assignedTo) {
        await notifyUser(ticketData.assignedTo, "Ticket Reopened", `Ticket "${ticketData.title}" was reopened. Reason: ${reason}`);
      }


      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Status Update: Reopened", `Your ticket "${ticketData.title}" was reopened for further work.`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  markAsUnderReview: async (ticketId) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      // Fetch first to check workflow
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Ticket not found");
      const ticketData = ticketSnap.data();

      if (!canTransitionTo(ticketData.status, TICKET_STATUS.UNDER_REVIEW)) {
        throw new Error(`Illegal State Transition: Cannot move from '${ticketData.status}' to '${TICKET_STATUS.UNDER_REVIEW}'`);
      }

      await updateDoc(ticketRef, {
        status: TICKET_STATUS.UNDER_REVIEW,
        updatedAt: Date.now()
      });


      if (ticketData.userId) {
        await notifyUser(ticketData.userId, "Under Review", `We are reviewing your report: "${ticketData.title}".`);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },


  mergeTickets: async (parentId, duplicateIds) => {
    try {
      const batch = writeBatch(db);

      duplicateIds.forEach(id => {
        const docRef = doc(db, TICKET_COLLECTION, id);
        batch.update(docRef, {
          status: 'merged',
          mergedInto: parentId,
          resolutionNotes: `Closed as duplicate of #${parentId.slice(0, 5)}`,
          updatedAt: Date.now()
        });
      });

      await batch.commit();


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

