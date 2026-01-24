import { useMemo } from 'react';
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
    const { data: authProfile } = useAuthProfile();
    const { data: userProfile } = useUserProfile();

    return useMemo(() => {
        const backendUser = userProfile?.user || authProfile;

        if (backendUser) {
            const displayName = backendUser.name || backendUser.email || 'User';
            const walletAddress = address || backendUser.walletAddress;

            return {
                id: backendUser.id?.toString(),
                name: backendUser.name || displayName,
                displayName,
                email: backendUser.email || '',
                avatar: backendUser.avatar || '',
                role: backendUser.role || 'USER',
                walletAddress,
                chainId,
                authMethod: address ? 'wallet' : 'traditional',
                isConnected: !!address,
            };
        }

        if (isConnected && address) {
            const displayName = formatAddressShort(address, 6, 6);

            return {
                id: address,
                name: displayName,
                displayName,
                email: address,
                avatar: '',
                role: 'USER',
                walletAddress: address,
                chainId,
                authMethod: 'wallet',
                isConnected: true,
            };
        }

        if (isAuthenticated && !address) {
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
    }, [address, isConnected, chainId, isAuthenticated, authProfile, userProfile]);
}
