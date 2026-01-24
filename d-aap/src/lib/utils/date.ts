import { format as dateFnsFormat, formatDistanceToNow } from 'date-fns';

export function formatDate(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    try {
        return dateFnsFormat(new Date(date), 'MMM dd, yyyy');
    } catch {
        return 'Invalid date';
    }
}

export function formatDateShort(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    try {
        return dateFnsFormat(new Date(date), 'MMM dd');
    } catch {
        return 'Invalid date';
    }
}

export function formatDateTime(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    try {
        return dateFnsFormat(new Date(date), 'MMM dd, yyyy HH:mm');
    } catch {
        return 'Invalid date';
    }
}

export function formatTime(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    try {
        return dateFnsFormat(new Date(date), 'HH:mm');
    } catch {
        return 'Invalid date';
    }
}

export function formatDateRange(
    startDate: string | Date | undefined | null,
    endDate: string | Date | undefined | null,
): string {
    if (!startDate || !endDate) return 'N/A';
    try {
        const start = formatDateShort(startDate);
        const end = formatDateShort(endDate);
        return `${start} - ${end}`;
    } catch {
        return 'Invalid date range';
    }
}

export function formatRelativeTime(date: string | Date | undefined | null): string {
    if (!date) return 'N/A';
    try {
        return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
        return 'Invalid date';
    }
}

export function formatEventDateTimeRange(
    startDate: string | Date | undefined | null,
    endDate: string | Date | undefined | null,
): string {
    if (!startDate || !endDate) return 'N/A';
    try {
        const start = dateFnsFormat(new Date(startDate), 'MMM dd, yyyy HH:mm');
        const end = dateFnsFormat(new Date(endDate), 'HH:mm');
        return `${start} - ${end}`;
    } catch {
        return 'Invalid date range';
    }
}

export function formatTimeAgo(date: string | Date | undefined | null): string {
    if (!date) return 'Recently';
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
        return 'Recently';
    }
}
