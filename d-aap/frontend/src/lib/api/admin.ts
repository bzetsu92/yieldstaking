import { api } from './client';
import type {
    AdminUsersResponse,
    PlatformStatistics,
    StakingContractAdmin,
    StakingPackageAdmin,
    AdminPositionsResponse,
    AdminTransactionsResponse,
    BlockchainSyncStatus,
    BlockchainHealth,
    UserRole,
    UserStatus,
} from '@/interfaces/admin';

export const fetchPlatformStatistics = () => 
    api.get<PlatformStatistics>('/v1/admin/statistics');

export const fetchAdminUsers = (params?: { page?: number; limit?: number }) =>
    api.get<AdminUsersResponse>('/v1/admin/users', { params });

export const updateUserRole = (userId: number, role: UserRole) =>
    api.put<{ id: number; email: string; name: string; role: UserRole }>(
        `/v1/admin/users/${userId}/role`,
        { role }
    );

export const updateUserStatus = (userId: number, status: UserStatus) =>
    api.put<{ id: number; email: string; name: string; status: UserStatus }>(
        `/v1/admin/users/${userId}/status`,
        { status }
    );

export const fetchAdminContracts = (chainId?: number) =>
    api.get<StakingContractAdmin[]>('/v1/admin/contracts', { 
        params: chainId ? { chainId } : undefined 
    });

export const fetchAdminPackages = (contractId?: number) =>
    api.get<StakingPackageAdmin[]>('/v1/admin/packages', { 
        params: contractId ? { contractId } : undefined 
    });

export const fetchAdminPositions = (params?: { 
    page?: number; 
    limit?: number; 
    walletAddress?: string;
    isWithdrawn?: boolean;
    userId?: number;
    search?: string;
}) => api.get<AdminPositionsResponse>('/v1/admin/positions', { params });

export const fetchAdminTransactions = (params?: { 
    page?: number; 
    limit?: number; 
    type?: string;
    userId?: number;
    search?: string;
    positionId?: number;
}) => api.get<AdminTransactionsResponse>('/v1/admin/transactions', { params });

export const fetchBlockchainSyncStatuses = () =>
    api.get<BlockchainSyncStatus[]>('/v1/blockchain/sync');

export const fetchBlockchainHealth = () =>
    api.get<BlockchainHealth>('/v1/blockchain/health');

export const triggerBlockchainSync = (chainId: number, contractAddress: string) =>
    api.post('/v1/blockchain/sync', { chainId, contractAddress });

export const processBlockchainEvents = (limit?: number) =>
    api.post('/v1/blockchain/process-events', null, { 
        params: limit ? { limit } : undefined 
    });

export const fetchUnprocessedEventCount = () =>
    api.get<{ count: number }>('/v1/blockchain/events/unprocessed/count');
