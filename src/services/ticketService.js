import { collection, addDoc, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createTicket, TICKET_STATUS } from '../constants/models';
import { canAssign } from '../constants/workflow';

const TICKET_COLLECTION = 'tickets';

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
      
      console.log('✅ Ticket created with ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error submitting ticket:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetches all tickets (For the Dispatcher)
   */
  getAllTickets: async () => {
    try {
      const querySnapshot = await getDocs(collection(db, TICKET_COLLECTION));
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
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
      
      const currentStatus = ticketSnap.data().status;

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
      
      return { success: true };
    } catch (error) {
      console.error("Error assigning ticket:", error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetches jobs assigned to a specific engineer ID
   */
  getEngineerJobs: async (engineerId) => {
    try {
      const q = query(
        collection(db, TICKET_COLLECTION), 
        where("assignedTo", "==", engineerId)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Fix the ID overwrite issue here too!
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      }));
    } catch (error) {
      console.error("Error fetching engineer jobs:", error);
      return [];
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
      console.error("Error getting ticket:", error);
      return null;
    }
  },

  /**
   * RESOLVE the ticket with evidence
   */
  resolveTicket: async (ticketId, notes, afterPhotoUrl) => {
    try {
      const ticketRef = doc(db, TICKET_COLLECTION, ticketId);
      
      await updateDoc(ticketRef, {
        status: TICKET_STATUS.RESOLVED,
        resolutionNotes: notes,
        afterPhoto: afterPhotoUrl, // The proof!
        resolvedAt: Date.now()
      });
      
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
      await updateDoc(ticketRef, {
        status: TICKET_STATUS.VERIFIED,
        verifiedAt: Date.now()
      });
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
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

