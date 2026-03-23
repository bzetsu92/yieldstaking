import React from 'react';
interface AdminWalletGuardProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function AdminWalletGuard({ children }: AdminWalletGuardProps) {
    return <>{children}</>;
}
