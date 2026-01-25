import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
    fetchPlatformStatistics,
    fetchAdminUsers,
    updateUserRole,
    updateUserStatus,
    fetchAdminContracts,
    fetchAdminPackages,
    fetchAdminPositions,
    fetchAdminTransactions,
    fetchBlockchainSyncStatuses,
    fetchBlockchainHealth,
    triggerBlockchainSync,
    processBlockchainEvents,
    fetchUnprocessedEventCount,
} from '@/lib/api/admin';

import type { UserRole, UserStatus } from '@/interfaces/admin';

export function usePlatformStatistics() {
    return useQuery({
        queryKey: ['admin', 'statistics'],
        queryFn: fetchPlatformStatistics,
        staleTime: 30 * 1000,
    });
}

export function useAdminUsers(params?: { page?: number; limit?: number }) {
    return useQuery({
        queryKey: ['admin', 'users', params],
        queryFn: () => fetchAdminUsers(params),
        staleTime: 30 * 1000,
    });
}

export function useUpdateUserRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
            updateUserRole(userId, role),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            toast.success('User role updated');
        },
        onError: () => {
            toast.error('Failed to update user role');
        },
    });
}

export function useUpdateUserStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, status }: { userId: number; status: UserStatus }) =>
            updateUserStatus(userId, status),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            toast.success('User status updated');
        },
        onError: () => {
            toast.error('Failed to update user status');
        },
    });
}

export function useAdminContracts(chainId?: number) {
    return useQuery({
        queryKey: ['admin', 'contracts', chainId],
        queryFn: () => fetchAdminContracts(chainId),
        staleTime: 60 * 1000,
    });
}

export function useAdminPackages(contractId?: number) {
    return useQuery({
        queryKey: ['admin', 'packages', contractId],
        queryFn: () => fetchAdminPackages(contractId),
        staleTime: 60 * 1000,
    });
}

export function useAdminPositions(params?: { 
    page?: number; 
    limit?: number; 
    walletAddress?: string;
    isWithdrawn?: boolean;
    userId?: number;
    search?: string;
}) {
    return useQuery({
        queryKey: ['admin', 'positions', params],
        queryFn: () => fetchAdminPositions(params),
        staleTime: 30 * 1000,
    });
}

export function useAdminTransactions(params?: { 
    page?: number; 
    limit?: number; 
    type?: string;
    userId?: number;
    search?: string;
    positionId?: number;
}) {
    return useQuery({
        queryKey: ['admin', 'transactions', params],
        queryFn: () => fetchAdminTransactions(params),
        staleTime: 30 * 1000,
    });
}

export function useBlockchainSyncStatuses() {
    return useQuery({
        queryKey: ['admin', 'blockchain', 'sync'],
        queryFn: fetchBlockchainSyncStatuses,
        staleTime: 10 * 1000,
    });
}

export function useBlockchainHealth() {
    return useQuery({
        queryKey: ['admin', 'blockchain', 'health'],
        queryFn: fetchBlockchainHealth,
        staleTime: 10 * 1000,
    });
}

export function useUnprocessedEventCount() {
    return useQuery({
        queryKey: ['admin', 'blockchain', 'unprocessed'],
        queryFn: fetchUnprocessedEventCount,
        staleTime: 10 * 1000,
        refetchInterval: 30 * 1000,
    });
}

export function useTriggerBlockchainSync() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ chainId, contractAddress }: { chainId: number; contractAddress: string }) =>
            triggerBlockchainSync(chainId, contractAddress),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'blockchain'] });
            toast.success('Blockchain sync triggered');
        },
        onError: () => {
            toast.error('Failed to trigger sync');
        },
    });
}

export function useProcessBlockchainEvents() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (limit?: number) => processBlockchainEvents(limit),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['admin', 'blockchain'] });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'positions'] });
            void queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
            toast.success('Events processed');
        },
        onError: () => {
            toast.error('Failed to process events');
        },
    });
}
