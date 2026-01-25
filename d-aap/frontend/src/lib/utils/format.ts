export function formatAddressShort(
    address: string | undefined | null,
    startLength?: number,
    endLength?: number,
): string {
    if (!address || typeof address !== 'string') {
        return '';
    }

    if (startLength === undefined && endLength === undefined) {
        if (address.length <= 5) {
            return address;
        }
        return address.slice(-5);
    }

    const start = startLength ?? 6;
    const end = endLength ?? 4;
    if (address.length <= start + end) {
        return address;
    }
    return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatAddress(address: string | undefined | null): string {
    if (!address || typeof address !== 'string') {
        return '';
    }
    if (address.length <= 10) {
        return address;
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTxHash(
    txHash: string | undefined | null,
    startLength: number = 10,
    endLength: number = 4,
): string {
    if (!txHash) return '';
    if (txHash.length <= startLength + endLength) return txHash;
    return `${txHash.slice(0, startLength)}...${txHash.slice(-endLength)}`;
}

export function formatPrice(
    price: number | string | undefined | null,
    currency: string = 'ETH',
    decimals: number = 3,
): string {
    if (price === undefined || price === null) return `0.${'0'.repeat(decimals)} ${currency}`;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return `0.${'0'.repeat(decimals)} ${currency}`;
    return `${numPrice.toFixed(decimals)} ${currency}`;
}

export function formatPriceLocale(
    price: number | string | undefined | null,
    currency: string = 'ETH',
): string {
    if (price === undefined || price === null) return `0 ${currency}`;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return `0 ${currency}`;
    return `${numPrice.toLocaleString()} ${currency}`;
}

export function formatPriceUSD(
    price: number | string | undefined | null,
    exchangeRate: number = 2500,
    decimals: number = 2,
): string {
    if (price === undefined || price === null) return `$0.${'0'.repeat(decimals)}`;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return `$0.${'0'.repeat(decimals)}`;
    return `$${(numPrice * exchangeRate).toFixed(decimals)}`;
}

export function formatNumberShort(
    num: number | string | undefined | null,
    decimals: number = 1,
): string {
    if (num === undefined || num === null) return '0';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';

    if (numValue >= 1_000_000_000) {
        return `${(numValue / 1_000_000_000).toFixed(decimals)}B`;
    }
    if (numValue >= 1_000_000) {
        return `${(numValue / 1_000_000).toFixed(decimals)}M`;
    }
    if (numValue >= 1_000) {
        return `${(numValue / 1_000).toFixed(decimals)}K`;
    }
    return numValue.toFixed(decimals);
}
