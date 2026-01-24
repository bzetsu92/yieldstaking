export type TransactionType =
    | 'TICKET_PURCHASE'
    | 'TICKET_TRANSFER_IN'
    | 'TICKET_TRANSFER_OUT'
    | 'PLATFORM_FEE'
    | 'TICKET_CHECK_IN';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    fromAddress?: string | null;
    toAddress?: string | null;
    txHash?: string | null;
    chain: string;
    chainSlug: string;
    explorerUrl?: string | null;
    event?: {
        id: number;
        title: string;
    } | null;
    timestamp: string;
}

export interface TransactionListResponse {
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
