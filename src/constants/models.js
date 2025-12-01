
/**
 * @typedef {Object} LocationData
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} [address] - Optional human-readable address
 */

/**
 * @typedef {Object} Ticket
 * @property {string} id - Unique ID from Firestore
 * @property {string} userId - The ID of the citizen who reported it
 * @property {string} title - Short description (e.g., "Deep Pothole")
 * @property {string} description - Full details
 * @property {'pothole' | 'streetlight' | 'flooding' | 'rubbish'} category
 * @property {'draft' | 'submitted' | 'assigned' | 'in_progress' | 'resolved' | 'verified'} status
 * @property {'low' | 'medium' | 'high'} priority
 * @property {LocationData} location
 * @property {string[]} photos - Array of image URLs
 * @property {string | null} video - Optional video URL
 * @property {number} createdAt - Timestamp (Date.now())
 * @property {number | null} assignedTo - Engineer ID (or null if unassigned)
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} uid - Firebase Auth ID
 * @property {string} email
 * @property {'citizen' | 'dispatcher' | 'engineer' | 'auditor'} role
 * @property {string} name
 */

/**
 * Creates a standard Ticket object to ensure all fields exist.
 * @param {string} userId - The current user's ID
 * @param {string} title 
 * @param {string} description 
 * @param {string} category 
 * @param {number} lat 
 * @param {number} lng 
 * @returns {Ticket}
 */

export const TICKET_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  VERIFIED: 'verified',
};

export const USER_ROLES = {
  CITIZEN: 'citizen',
  DISPATCHER: 'dispatcher',
  ENGINEER: 'engineer',
  AUDITOR: 'auditor',
};


export const createTicket = (userId, title, description, category, lat, lng) => {
  return {
    id: '', // Will be set by Firestore
    userId,
    title,
    description,
    category,
    status: TICKET_STATUS.DRAFT, // Default to Draft
    priority: 'medium',            // Default to Medium
    location: {
      latitude: lat,
      longitude: lng,
    },
    photos: [],
    video: null,
    createdAt: Date.now(),
    assignedTo: null,
  };
};