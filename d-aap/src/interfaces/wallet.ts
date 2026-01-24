export type TransactionType =
    | 'TICKET_PURCHASE'
    | 'TICKET_TRANSFER_IN'
    | 'TICKET_TRANSFER_OUT'
    | 'PLATFORM_FEE'
    | 'TICKET_CHECK_IN'
    | 'MINT'
    | 'BUY'
    | 'SELL'
    | 'TRANSFER'
    | 'BID'
    | 'DEPOSIT'
    | 'WITHDRAW';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface WalletBalance {
    address: string;
    balances: {
        currency: string;
        amount: number;
        usdValue: number;
    }[];
    totalUsdValue: number;
    nftCount: number;
    nftValue: number;
}

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    currency: string;
    fromAddress?: string;
    toAddress?: string;
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

export interface DepositAddressResponse {
    address: string;
    qrCode?: string;
}

export interface WithdrawFundsData {
    currency: string;
    amount: number;
    address: string;
    otp?: string;
}

export interface WithdrawFundsResponse {
    txHash: string;
    status: string;
}
