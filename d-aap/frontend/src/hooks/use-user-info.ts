import { useMemo } from 'react';
import { getAddress, isAddress } from 'viem';
import { useAccount } from 'wagmi';

import { formatAddressShort } from '@/lib/utils';

import { useAuthProfile, useUserProfile } from './use-api-queries';
import { useAuthentication } from './use-authentication';

export interface UserInfo {
    id?: string;
    name: string;
    displayName: string;
    email: string;
    avatar: string;
    role: string;
    walletAddress?: string;
    chainId?: number;
    authMethod: 'wallet' | 'traditional' | 'guest';
    isConnected: boolean;
}

export function useUserInfo(): UserInfo {
    const { address, isConnected, chainId } = useAccount();
    const { isAuthenticated } = useAuthentication();
    const { data: authProfile, isPending: authProfilePending } = useAuthProfile();
    const { data: userProfile, isPending: userProfilePending } = useUserProfile();

    return useMemo(() => {
        const backendUser = userProfile?.user || authProfile;
        const normalizeAddr = (a: string | null | undefined) =>
            a && isAddress(a) ? getAddress(a) : undefined;

        if (backendUser) {
            const displayName = backendUser.name || backendUser.email || 'User';
            const linked = normalizeAddr(backendUser.walletAddress ?? undefined);
            const browser = address && isAddress(address) ? getAddress(address) : undefined;
            const walletAddress = linked ?? browser;

            return {
                id: backendUser.id?.toString(),
                name: backendUser.name || displayName,
                displayName,
                email: backendUser.email || '',
                avatar: '',
                role: backendUser.role || 'USER',
                walletAddress,
                chainId,
                authMethod: address ? 'wallet' : 'traditional',
                isConnected: !!address,
            };
        }

        if (isConnected && address) {
            const displayName = formatAddressShort(address, 6, 6);
            const walletAddress = isAddress(address) ? getAddress(address) : undefined;

            return {
                id: address,
                name: displayName,
                displayName,
                email: address,
                avatar: '',
                role: 'USER',
                walletAddress,
                chainId,
                authMethod: 'wallet',
                isConnected: true,
            };
        }

        const profilePending = authProfilePending || userProfilePending;
        if (isAuthenticated && profilePending && !backendUser) {
            return {
                name: 'User',
                displayName: '…',
                email: '',
                avatar: '',
                role: 'USER',
                authMethod: 'traditional',
                isConnected: false,
            };
        }

        if (isAuthenticated && !address && !profilePending) {
            return {
                name: 'User',
                displayName: 'User',
                email: '',
                avatar: '',
                role: 'USER',
                authMethod: 'traditional',
                isConnected: false,
            };
        }

        return {
            name: 'Guest',
            displayName: 'Guest',
            email: '',
            avatar: '',
            role: 'GUEST',
            authMethod: 'guest',
            isConnected: false,
        };
    }, [
        address,
        isConnected,
        chainId,
        isAuthenticated,
        authProfile,
        userProfile,
        authProfilePending,
        userProfilePending,
    ]);
}
