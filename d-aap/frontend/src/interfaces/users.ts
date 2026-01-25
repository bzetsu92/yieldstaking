export interface UpdateProfileData {
    name?: string;
    avatar?: string;
    bio?: string;
}

export interface UserProfile {
    id: number;
    email: string | null;
    name: string;
    avatar?: string | null;
    bio?: string | null;
    role: 'USER' | 'ADMIN';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    emailVerified: boolean;
    walletAddress?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserStatistics {
    totalStaked: string;
    totalClaimed: string;
    totalWithdrawn: string;
    activeStakes: number;
    completedStakes: number;
    pendingRewards: string;
    currentActiveStaked?: string;
}

export interface UserProfileWithStatsResponse {
    user: {
        id: number;
        name: string;
        email: string | null;
        avatar: string | null;
        bio: string | null;
        role: 'USER' | 'ADMIN';
        walletAddress: string | null;
        createdAt: string;
    };
    stats: UserStatistics;
}
