import { useMemo, useEffect, useState } from 'react';
import { useAccount, useBalance } from 'wagmi';

import { SUPPORTED_CHAINS } from '@/lib/config/chains';
import { WALLET_BALANCE_CONFIG } from '@/lib/constants/wallet';
import { walletService } from '@/lib/wallet/wallet.service';
import { logger } from '@/lib/utils/logger';

interface CachedBalance {
    address: string;
    chainId: number;
    balance: { formatted: string; symbol: string };
    timestamp: number;
}

export function useWalletBalance() {
    const { address, chainId, isConnected } = useAccount();
    const [cachedData, setCachedData] = useState<CachedBalance | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const isValidChain = useMemo(() => {
        if (!chainId) return false;
        return SUPPORTED_CHAINS.some((chain) => chain.id === chainId);
    }, [chainId]);

    const queryOptions = useMemo(() => {
        const enabled = Boolean(
            address && chainId && isConnected && isValidChain && walletService.isWalletAvailable(),
        );

        return {
            enabled,
            staleTime: WALLET_BALANCE_CONFIG.staleTime,
            gcTime: WALLET_BALANCE_CONFIG.gcTime,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            refetchOnMount: true,
            placeholderData: (
                prev:
                    | { formatted: string; symbol: string; value: bigint; decimals: number }
                    | undefined,
            ) => prev,
            retry: (failureCount: number, error: unknown) => {
                const err = error as { code?: number | string; message?: string };
                if (err?.code === 4001) {
                    logger.debug('User rejected balance request');
                    return false;
                }
                if (err?.code === -32603) {
                    logger.warn('Internal RPC error, retrying...', { attempt: failureCount });
                    return failureCount < 2;
                }
                logger.debug('Retrying balance fetch', {
                    attempt: failureCount,
                    error: err?.message,
                });
                return failureCount < WALLET_BALANCE_CONFIG.retryCount;
            },
            retryDelay: (attemptIndex: number) => WALLET_BALANCE_CONFIG.retryDelay(attemptIndex),
        };
    }, [address, chainId, isConnected, isValidChain]);

    const {
        data: balance,
        isLoading,
        error,
        refetch,
    } = useBalance({
        address: address,
        chainId,
        query: queryOptions,
    });

    useEffect(() => {
        const verifyConnection = async () => {
            if (!isConnected || !address || !chainId) {
                setCachedData(null);
                return;
            }

            if (!isValidChain) {
                logger.warn('Unsupported chain', { chainId });
                setCachedData(null);
                return;
            }

            try {
                setIsVerifying(true);
                const isVerified = await walletService.verifyConnection(address);
                if (!isVerified) {
                    logger.warn('Wallet connection not verified', { address });
                    setCachedData(null);
                    return;
                }
            } catch (error) {
                logger.error('Failed to verify wallet connection', { error, address });
            } finally {
                setIsVerifying(false);
            }

            if (cachedData && (cachedData.chainId !== chainId || cachedData.address !== address)) {
                logger.debug('Wallet changed, clearing cache', {
                    oldAddress: cachedData.address,
                    newAddress: address,
                    oldChainId: cachedData.chainId,
                    newChainId: chainId,
                });
                setCachedData(null);
            }
        };

        void verifyConnection();
    }, [chainId, address, isConnected, isValidChain, cachedData]);

    useEffect(() => {
        if (!isConnected || !address || !chainId || !balance || !isValidChain) {
            return;
        }

        const currentFormatted = balance.formatted;
        const currentSymbol = balance.symbol;

        if (!currentFormatted || !currentSymbol) {
            logger.debug('Balance data incomplete', {
                formatted: currentFormatted,
                symbol: currentSymbol,
            });
            return;
        }

        const newData: CachedBalance = {
            address,
            chainId,
            balance: { formatted: currentFormatted, symbol: currentSymbol },
            timestamp: Date.now(),
        };
        setCachedData(newData);
        logger.debug('Balance cached', {
            address,
            chainId,
            formatted: currentFormatted,
            symbol: currentSymbol,
        });
    }, [isConnected, address, chainId, balance?.formatted, balance?.symbol, isValidChain]);

    useEffect(() => {
        if (error) {
            logger.error('Balance fetch error', { error, address, chainId });
        }
    }, [error, address, chainId]);

    const shouldUseCache = useMemo(() => {
        if (!cachedData || !address || !chainId) return false;
        const isValid =
            cachedData.address === address &&
            cachedData.chainId === chainId &&
            cachedData.timestamp &&
            Date.now() - cachedData.timestamp < WALLET_BALANCE_CONFIG.cacheTimeout;
        return isValid;
    }, [cachedData, address, chainId]);

    const displayBalance = useMemo(() => {
        if (balance) {
            return balance;
        }
        if (
            shouldUseCache &&
            cachedData?.balance &&
            cachedData.chainId === chainId &&
            cachedData.address === address
        ) {
            return {
                formatted: cachedData.balance.formatted,
                symbol: cachedData.balance.symbol,
                value: BigInt(0),
                decimals: 18,
            };
        }
        return null;
    }, [balance, shouldUseCache, cachedData, chainId, address]);

    const formatted = useMemo(() => {
        if (!displayBalance?.formatted) return '';
        try {
            const num = parseFloat(displayBalance.formatted);
            if (isNaN(num) || num === 0) return '0';
            const formatted = num.toFixed(4);
            return formatted.replace(/\.?0+$/, '');
        } catch {
            return displayBalance.formatted || '0';
        }
    }, [displayBalance]);

    const isStale = useMemo(
        () =>
            Boolean(
                shouldUseCache &&
                    cachedData &&
                    Date.now() - cachedData.timestamp > WALLET_BALANCE_CONFIG.staleThreshold,
            ),
        [shouldUseCache, cachedData],
    );

    return {
        address,
        isConnected: isConnected && isValidChain && !isVerifying,
        displayBalance,
        formatted,
        isLoading: isLoading || isVerifying,
        error,
        isStale,
        refetch,
    };
}
