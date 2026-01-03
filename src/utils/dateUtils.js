export const formatRelativeTime = (date) => {
    if (!date) return '';

    // Convert generic inputs to Date object
    const d = new Date(date);
    // If invalid date, return generic string (or original if string)
    if (isNaN(d.getTime())) return typeof date === 'string' ? date : '';

    const seconds = Math.floor((new Date() - d) / 1000);
    const days = seconds / 86400;

    // > 8 days logic: show Fixed Date and Time
    if (days > 8) {
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    return Math.floor(seconds) < 5 ? "Just now" : Math.floor(seconds) + " seconds ago";
};
