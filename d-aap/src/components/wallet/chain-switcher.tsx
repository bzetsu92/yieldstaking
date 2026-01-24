import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChevronDown, Network, LogOut } from 'lucide-react';
import React, { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useAccount, useSwitchChain, useDisconnect } from 'wagmi';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMounted } from '@/hooks/use-mounted';
import { wagmiConfig as config } from '@/lib/blockchain';
import { handleModalError } from '@/lib/utils/modal-error-handler';

const SUPPORTED_CHAINS = config.chains;

interface ChainInfo {
    id: number;
    name: string;
    iconUrl?: string | null;
    nativeCurrency: {
        symbol: string;
    };
}

const createChainInfo = (chain: (typeof SUPPORTED_CHAINS)[number]): ChainInfo => ({
    id: chain.id,
    name: chain.name,
    iconUrl: typeof chain.iconUrl === 'string' ? chain.iconUrl : undefined,
    nativeCurrency: chain.nativeCurrency,
});

function ChainSwitcherComponent() {
    const mounted = useMounted();
    const { chainId, isConnected } = useAccount();
    const { switchChain, isPending, error } = useSwitchChain();
    const { disconnect } = useDisconnect();
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

    const currentChain = useMemo(() => {
        const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId);
        return chain ? createChainInfo(chain) : undefined;
    }, [chainId]);

    const currentChainName = useMemo(() => currentChain?.name || 'Unknown', [currentChain?.name]);

    const handleSwitchChain = useCallback(
        async (targetChainId: number) => {
            if (isPending || chainId === targetChainId) return;

            try {
                switchChain({ chainId: targetChainId });
                const foundChain = SUPPORTED_CHAINS.find((c) => c.id === targetChainId);
                const targetChain = foundChain ? createChainInfo(foundChain) : undefined;
                toast.success(`Switched to ${targetChain?.name || 'network'}`);
                setIsDropdownOpen(false);
            } catch (error: unknown) {
                handleModalError({
                    error,
                    context: 'Switch network',
                    defaultMessage: 'Failed to switch network',
                });
            }
        },
        [switchChain, isPending, chainId],
    );

    const handleDisconnect = useCallback(() => {
        try {
            disconnect();
            toast.success('Wallet disconnected');
            setIsDropdownOpen(false);
        } catch (error) {
            handleModalError({
                error,
                context: 'Disconnect wallet',
                defaultMessage: 'Failed to disconnect wallet',
            });
        }
    }, [disconnect]);

    const buttonClassName = useMemo(() => {
        const baseClasses = 'h-8 px-3 text-sm font-medium transition-all duration-200';
        if (error) {
            return `${baseClasses} bg-gradient-to-r from-red-50 to-pink-50 border-red-200 hover:border-red-300 dark:from-red-950/20 dark:to-pink-950/20 dark:border-red-800 dark:hover:border-red-700`;
        }
        return `${baseClasses} bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 hover:border-blue-300 dark:from-blue-950/20 dark:to-purple-950/20 dark:border-blue-800 dark:hover:border-blue-700`;
    }, [error]);

    if (!mounted || !isConnected) return null;

    return (
        <ConnectButton.Custom>
            {({ account, chain, authenticationStatus, mounted: connectMounted }) => {
                const ready = connectMounted && authenticationStatus !== 'loading';
                const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');

                if (!connected) return null;

                return (
                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className={buttonClassName}
                                disabled={isPending}
                            >
                                <div className="flex items-center gap-2">
                                    {isPending ? (
                                        <div className="w-5 h-5 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    ) : currentChain?.iconUrl ? (
                                        <img
                                            src={currentChain.iconUrl}
                                            alt={currentChain.name}
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
                                    <span className="font-medium text-foreground">
                                        {isPending ? 'Switching...' : currentChainName}
                                    </span>
                                    <ChevronDown
                                        className={`h-3 w-3 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                                            isDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 py-1.5 px-2">
                            <div className="space-y-0.5">
                                {SUPPORTED_CHAINS.map((chain) => {
                                    const isActive = chainId === chain.id;
                                    const chainInfo = createChainInfo(chain);

                                    return (
                                        <DropdownMenuItem
                                            key={chain.id}
                                            onClick={() => void handleSwitchChain(chain.id)}
                                            disabled={isPending || isActive}
                                            className={`cursor-pointer rounded-lg py-2 px-3 transition-all duration-200 ${
                                                isActive
                                                    ? 'bg-green-50 hover:bg-green-100 border border-green-200 dark:bg-green-950/20 dark:hover:bg-green-950/30 dark:border-green-800'
                                                    : 'hover:bg-accent'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    {chainInfo.iconUrl ? (
                                                        <div className="relative flex-shrink-0">
                                                            <img
                                                                src={chainInfo.iconUrl}
                                                                alt={chainInfo.name}
                                                                className="w-8 h-8 rounded-full object-cover border border-border shadow-sm"
                                                                onError={(e) => {
                                                                    const target =
                                                                        e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                }}
                                                            />
                                                            {isActive && (
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
                                                            <Network className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-sm text-foreground">
                                                        {chainInfo.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isActive && (
                                                        <Badge
                                                            variant="default"
                                                            className="text-xs bg-green-500 hover:bg-green-600"
                                                        >
                                                            Active
                                                        </Badge>
                                                    )}
                                                    {isPending && !isActive && (
                                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    )}
                                                </div>
                                            </div>
                                        </DropdownMenuItem>
                                    );
                                })}

                                {chainId && !SUPPORTED_CHAINS.find((c) => c.id === chainId) && (
                                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950/20 dark:border-yellow-800">
                                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                                            <div className="w-4 h-4 rounded-full bg-yellow-500 dark:bg-yellow-400" />
                                            <span className="text-xs font-medium">
                                                Unsupported network detected
                                            </span>
                                        </div>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                                            Please switch to a supported network
                                        </p>
                                    </div>
                                )}
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleDisconnect}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Disconnect Wallet
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            }}
        </ConnectButton.Custom>
    );
}

export const ChainSwitcher = React.memo(ChainSwitcherComponent);
ChainSwitcher.displayName = 'ChainSwitcher';
