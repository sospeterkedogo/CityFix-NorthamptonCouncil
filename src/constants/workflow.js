import { TICKET_STATUS } from './models';

/**
 * THE STATE MACHINE
 * Defines allowed next states for every current state.
 */
export const ALLOWED_TRANSITIONS = {
  [TICKET_STATUS.DRAFT]:       [TICKET_STATUS.SUBMITTED],
  
  // Dispatcher can Assign or put Under Review
  [TICKET_STATUS.SUBMITTED]:   [TICKET_STATUS.ASSIGNED, 'under_review'],
  
  // Engineer can start work
  [TICKET_STATUS.ASSIGNED]:    [TICKET_STATUS.IN_PROGRESS],
  
  // Engineer can Resolve (after evidence)
  [TICKET_STATUS.IN_PROGRESS]: [TICKET_STATUS.RESOLVED],
  
  // QA/Dispatcher can Verify or Reopen
  [TICKET_STATUS.RESOLVED]:    [TICKET_STATUS.VERIFIED, 'reopened'],
  
  // Loop back if reopened
  'reopened':                  [TICKET_STATUS.ASSIGNED],
  
  // Terminal State (End of the line)
  [TICKET_STATUS.VERIFIED]:    [], 
};

/**
 * Helper to check if a move is legal
 */
export const canTransitionTo = (currentStatus, nextStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
};

/**
 * Helper to check if Assigning is allowed
 * (This answers your specific request about blocking the dispatcher)
 */
export const canAssign = (status) => {
  return [TICKET_STATUS.SUBMITTED, 'reopened', 'under_review'].includes(status);
};