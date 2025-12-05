export const SLA_HOURS = 48;

/**
 * Calculates the deadline timestamp based on creation time
 */
export const getDeadline = (createdAt) => {
  return createdAt + (SLA_HOURS * 60 * 60 * 1000);
};

/**
 * Returns a formatted string and status for the UI
 */
export const getSLAStatus = (createdAt) => {
  const deadline = getDeadline(createdAt);
  const now = Date.now();
  const diff = deadline - now;

  const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
  const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diff < 0) {
    const hoursOver = Math.abs(hoursLeft);
    return {
      text: `OVERDUE by ${hoursOver}h`,
      isOverdue: true,
      color: '#E74C3C' // Red
    };
  }

  // Warning zone: Less than 4 hours left
  if (hoursLeft < 4) {
    return {
      text: `${hoursLeft}h ${minutesLeft}m left`,
      isOverdue: false,
      color: '#F39C12' // Orange
    };
  }

  return {
    text: `${hoursLeft}h left`,
    isOverdue: false,
    color: '#27AE60' // Green
  };
};