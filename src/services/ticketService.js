import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createTicket, TICKET_STATUS } from '../constants/models';

const TICKET_COLLECTION = 'tickets';

export const TicketService = {
  /**
   * Submits a new ticket to Firestore
   */
  submitTicket: async (userId, title, description, category, lat, lng) => {
    try {
      // 1. Use the Factory Function to enforce structure
      const ticketData = createTicket(userId, title, description, category, lat, lng);
      
      // 2. Set status to SUBMITTED
      ticketData.status = TICKET_STATUS.SUBMITTED;

      // 3. Write to Firestore
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
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }
  }
};