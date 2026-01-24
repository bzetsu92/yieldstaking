import type { Event } from './events';
import type { NFT } from './nfts';
import type { Transaction } from './wallet';

export interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    bio?: string;
    walletAddress?: string;
    createdAt: string;
    updatedAt: string;
}

export type NotificationType =
    | 'EVENT_CREATED'
    | 'TICKET_PURCHASED'
    | 'TICKET_TRANSFERRED'
    | 'CHECK_IN_REMINDER'
    | 'EVENT_STARTING_SOON'
    | 'EVENT_ENDED'
    | 'WALLET_VERIFIED'
    | 'ORGANIZER_WHITELISTED';

export interface Notification {
    id: number;
    userId: number;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    status: 'PENDING' | 'SENT' | 'READ' | 'FAILED';
    eventId?: number | null;
    event?: Event | null;
    ticketId?: number | null;
    link?: string | null;
    metadata?: Record<string, any> | null;
    createdAt: string;
    updatedAt: string;
    readAt?: string | null;
}
