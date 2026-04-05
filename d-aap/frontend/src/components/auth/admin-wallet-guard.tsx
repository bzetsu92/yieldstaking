import React from 'react';
import { useAdminWalletAccess } from '@/hooks/use-admin-wallet-access';

interface AdminWalletGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function AdminWalletGuard({ children, fallback = null }: AdminWalletGuardProps) {
    const { isConnected, isSupportedChain, isAdminWallet, isChecking } = useAdminWalletAccess();

    if (!isConnected || !isSupportedChain || isChecking || !isAdminWallet) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
