export interface UpdateProfileData {
    name?: string;
    avatar?: string;
    bio?: string;
}

export interface UserProfile {
    id: number;
    email: string;
    name: string;
    avatar?: string | null;
    bio?: string | null;
    role: string;
    status: string;
    emailVerified: boolean;
    walletAddress?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserStatistics {
    eventsOrganized: number;
    eventsAttended: number;
    ticketsPurchased: number;
    totalSpent: number;
    ticketsSold?: number;
    totalRevenue?: number;
}

export interface UserProfileWithStatsResponse {
    user: {
        id: number;
        name: string;
        email: string;
        avatar?: string | null;
        bio?: string | null;
        role?: string;
        walletAddress?: string | null;
        createdAt?: string;
    };
    stats: {
        totalEvents: number;
        totalAttendees: number;
        totalTicketsSold: number;
        upcomingEvents: number;
        ongoingEvents: number;
        pastEvents: number;
    };
}
