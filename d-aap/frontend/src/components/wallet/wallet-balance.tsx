import { LogOut, MoreVertical, Network } from 'lucide-react';
import React, { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useDisconnect, useAccount } from 'wagmi';

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMounted } from '@/hooks/use-mounted';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { wagmiConfig as config } from '@/lib/blockchain';
import { handleModalError } from '@/lib/utils/modal-error-handler';

const BalanceError = React.memo(({ onRetry }: { onRetry: () => void }) => (
    <Button
        variant="outline"
        size="sm"
        className="h-8 px-3 border-destructive/50 bg-destructive/10 hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30"
        onClick={onRetry}
        title="Click to retry fetching balance"
    >
        <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
        <span className="text-xs font-medium text-destructive dark:text-destructive-foreground">
            Error
        </span>
    </Button>
));
BalanceError.displayName = 'BalanceError';

const BalanceLoading = React.memo(() => (
    <Button variant="outline" size="sm" className="h-8 px-3" disabled>
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
        <div className="w-12 h-3 bg-muted-foreground/30 rounded animate-pulse" />
    </Button>
));
BalanceLoading.displayName = 'BalanceLoading';

const BalanceEmpty = React.memo(() => (
    <Button variant="outline" size="sm" className="h-8 px-3" disabled>
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
        <span className="text-xs font-medium text-muted-foreground">--</span>
    </Button>
));
BalanceEmpty.displayName = 'BalanceEmpty';

interface BalanceDisplayProps {
    formatted: string;
    chainIconUrl?: string | null;
    isStale: boolean;
    isLoading: boolean;
    shouldUseCache: boolean | null;
    onRefresh: () => void;
}

const BalanceDisplay = React.memo(
    ({
        formatted,
        chainIconUrl,
        isStale,
        isLoading,
        shouldUseCache,
        onRefresh,
    }: BalanceDisplayProps) => {
        const displayText = useMemo(
            () => (isLoading && !shouldUseCache ? '...' : formatted),
            [isLoading, shouldUseCache, formatted],
        );

        const styles = useMemo(() => {
            if (isStale) {
                return {
                    dotColor: 'bg-amber-500 dark:bg-amber-400',
                    textColor: 'text-amber-700 dark:text-amber-300',
                    buttonClassName:
                        'h-8 px-3 border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-800 dark:bg-amber-950/20 dark:hover:bg-amber-950/30',
                };
            }
            return {
                dotColor: 'bg-emerald-500 dark:bg-emerald-400',
                textColor: 'text-emerald-700 dark:text-emerald-300',
                buttonClassName:
                    'h-8 px-3 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 dark:border-emerald-800 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30',
            };
        }, [isStale]);

        const title = useMemo(
            () =>
                `Balance: ${formatted}${isStale ? ' (stale data - click to refresh)' : ' (click to refresh)'}`,
            [formatted, isStale],
        );

        return (
            <Button
                variant="outline"
                size="sm"
                className={styles.buttonClassName}
                onClick={onRefresh}
                title={title}
            >
                <div className="flex items-center gap-1.5">
                    {chainIconUrl ? (
                        <img
                            src={chainIconUrl}
                            alt="Chain"
                            className="w-5 h-5 rounded-full object-cover border border-border shadow-sm flex-shrink-0"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
                            <Network className="w-3 h-3 text-muted-foreground" />
                        </div>
                    )}
                    <div className={`w-1.5 h-1.5 rounded-full ${styles.dotColor} flex-shrink-0`} />
                    <span className={`text-xs font-medium ${styles.textColor}`}>{displayText}</span>
                </div>
            </Button>
        );
    },
);
BalanceDisplay.displayName = 'BalanceDisplay';

const SUPPORTED_CHAINS = config.chains;

function WalletBalanceComponent() {
    const mounted = useMounted();
    const { disconnect } = useDisconnect();
    const { chainId } = useAccount();
    const { address, isConnected, displayBalance, formatted, isLoading, error, isStale, refetch } =
        useWalletBalance();

    const shouldUseCache = useMemo(
        () => Boolean(displayBalance && !error),
        [displayBalance, error],
    );

    const chainIconUrl = useMemo(() => {
        if (!chainId) return null;
        const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
        return chain && typeof chain.iconUrl === 'string' ? chain.iconUrl : null;
    }, [chainId]);

    const handleDisconnect = useCallback(() => {
        try {
            disconnect();
            toast.success('Wallet disconnected');
        } catch (error) {
            handleModalError({
                error,
                context: 'Disconnect wallet',
                defaultMessage: 'Failed to disconnect wallet',
            });
        }
    }, [disconnect]);

    if (!mounted || !isConnected || !address) return null;

    if (error && !displayBalance) {
        return <BalanceError onRetry={() => void refetch()} />;
    }

    if (isLoading && !displayBalance) {
        return <BalanceLoading />;
    }

    if (!displayBalance || !formatted) {
        return <BalanceEmpty />;
    }

    return (
        <div className="flex items-center gap-2">
            <BalanceDisplay
                formatted={formatted}
                chainIconUrl={chainIconUrl}
                isStale={isStale}
                isLoading={isLoading}
                shouldUseCache={shouldUseCache}
                onRefresh={() => void refetch()}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        onClick={() => void handleDisconnect()}
                        className="text-destructive focus:text-destructive cursor-pointer"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect Wallet
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export const WalletBalance = React.memo(WalletBalanceComponent);
WalletBalance.displayName = 'WalletBalance';
