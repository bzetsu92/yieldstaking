import { formatAddressShort } from './format';

/**
 * Generate initials from name (e.g., "John Doe" -> "JD")
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 * @returns Initials string
 */
export function getInitials(name: string | undefined | null, maxLength: number = 2): string {
    if (!name || name.trim().length === 0) return 'U';

    const words = name.trim().split(/\s+/);
    const initials = words
        .map((word) => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, maxLength);

    return initials || 'U';
}

/**
 * Generate avatar URL from address or name
 * @param address - Wallet address or identifier
 * @param name - Name (optional, used as fallback)
 * @returns Avatar URL
 */
export function generateAvatarUrl(address?: string | null, name?: string | null): string {
    // TODO: Integrate with avatar service (e.g., DiceBear, ENS, etc.)
    if (address) {
        // Could use services like:
        // - https://api.dicebear.com/7.x/avataaars/svg?seed=${address}
        // - https://effigy.im/a/${address}.svg
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
    }
    if (name) {
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;
    }
    return '/placeholder.svg';
}

/**
 * Generate random name from address (deterministic)
 * @param address - Wallet address
 * @param names - Array of names to choose from
 * @returns Random name based on address
 */
export function generateNameFromAddress(
    address: string | undefined | null,
    names: string[] = [
        'Aqua Explorer',
        'Ocean Rider',
        'Wave Surfer',
        'Deep Diver',
        'Coral Guardian',
        'Tide Walker',
        'Sea Navigator',
        'Blue Voyager',
        'Water Spirit',
        'Marine Scout',
        'Current Rider',
        'Reef Explorer',
        'Sea Wanderer',
        'Ocean Guardian',
        'Aqua Traveler',
        'Wave Chaser',
        'Depth Seeker',
        'Tide Master',
        'Sea Captain',
        'Blue Explorer',
    ],
): string {
    if (!address) {
        return names[Math.floor(Math.random() * names.length)];
    }

    try {
        const addressNum = parseInt(address.slice(2, 8), 16);
        const index = addressNum % names.length;
        return names[index];
    } catch {
        return names[0];
    }
}

/**
 * Get display name from user data
 * @param name - User name
 * @param address - Wallet address (used as fallback)
 * @returns Display name
 */
export function getDisplayName(name?: string | null, address?: string | null): string {
    if (name && name.trim().length > 0) {
        return name.trim();
    }
    if (address) {
        return formatAddressShort(address);
    }
    return 'Guest User';
}

export { formatAddressShort };
