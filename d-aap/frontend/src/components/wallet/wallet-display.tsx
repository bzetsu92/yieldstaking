import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LogOut } from 'lucide-react';
import React, { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAccount, useDisconnect } from 'wagmi';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMounted } from '@/hooks/use-mounted';
import { hasAccountAuth } from '@/lib/auth';
import { useAuthentication } from '@/hooks/use-authentication';
import { handleModalError } from '@/lib/utils/modal-error-handler';
import { useAuthProfile } from '@/hooks/use-api-queries';
import { useAdminWalletAccess } from '@/hooks/use-admin-wallet-access';

function WalletDisplayComponent() {
    const mounted = useMounted();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const { signOut } = useAuthentication();
    const hasAccount = hasAccountAuth();
    const { data: profile } = useAuthProfile();
    const { isAdminWallet, isChecking, isSupportedChain } = useAdminWalletAccess();
    const rejectedAdminWalletRef = useRef<string | null>(null);

    useEffect(() => {
        if (profile?.role !== 'ADMIN' || !isConnected || !address) {
            rejectedAdminWalletRef.current = null;
            return;
        }

        if (isChecking) {
            return;
        }

        if (!isSupportedChain || !isAdminWallet) {
            const normalizedAddress = address.toLowerCase();

            if (rejectedAdminWalletRef.current === normalizedAddress) {
                return;
            }

            rejectedAdminWalletRef.current = normalizedAddress;
            toast.error('Admin wallet required', {
                description: isSupportedChain
                    ? 'This wallet does not have admin permissions for the staking contract.'
                    : 'Please switch to Sepolia and connect the assigned admin wallet.',
            });
            disconnect();
            return;
        }

        rejectedAdminWalletRef.current = null;
    }, [address, disconnect, isAdminWallet, isChecking, isConnected, isSupportedChain, profile?.role]);

    const handleDisconnect = useCallback(() => {
        try {
            disconnect();
            if (!hasAccount) {
                signOut();
                toast.success('Wallet disconnected and logged out');
            } else {
                toast.success('Wallet disconnected');
            }
        } catch (error) {
            handleModalError({
                error,
                context: 'Disconnect wallet',
                defaultMessage: 'Failed to disconnect wallet',
            });
        }
    }, [disconnect, hasAccount, signOut]);

    if (!mounted) return null;

    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted: connectMounted,
            }) => {
                const ready = connectMounted && authenticationStatus !== 'loading';
                const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');

                if (!connected) {
                    return (
                        <Button onClick={openConnectModal} variant="default" className="h-8 px-4">
                            Connect Wallet
                        </Button>
                    );
                }

                if (!account || !chain) return null;
                const isUnsupported = chain.unsupported ?? false;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-8 px-3 gap-2">
                                <div className="flex items-center gap-2">
                                    {isUnsupported ? (
                                        <span className="text-xs text-destructive">
                                            Wrong Network
                                        </span>
                                    ) : (
                                        <span>{account.displayName}</span>
                                    )}
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="px-2 py-1.5">
                                <div className="text-sm font-medium">{account.displayName}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {account.address}
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={openAccountModal}>Account</DropdownMenuItem>
                            <DropdownMenuItem onClick={openChainModal}>
                                {isUnsupported ? 'Wrong Network' : chain.name}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleDisconnect}
                                className="text-destructive focus:text-destructive"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Disconnect
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }}
        </ConnectButton.Custom>
    );
}

export const WalletDisplay = React.memo(WalletDisplayComponent);
WalletDisplay.displayName = 'WalletDisplay';
