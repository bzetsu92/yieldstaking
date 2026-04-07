import { getAddress, isAddress } from 'viem';

export function normalizeWalletAddress(walletAddress?: string | null): string | undefined {
    if (!walletAddress) {
        return undefined;
    }

    const trimmedAddress = walletAddress.trim();
    if (!trimmedAddress || !isAddress(trimmedAddress)) {
        return undefined;
    }

    return getAddress(trimmedAddress);
}
