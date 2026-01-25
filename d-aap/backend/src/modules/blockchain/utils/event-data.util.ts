export function serializeEventData(
    args: Record<string, unknown>,
): Record<string, unknown> {
    const eventData: Record<string, unknown> = {};

    for (const key in args) {
        const value = args[key];
        if (typeof value === "bigint") {
            eventData[key] = value.toString();
        } else if (Array.isArray(value)) {
            eventData[key] = value.map((v) =>
                typeof v === "bigint" ? v.toString() : v,
            );
        } else {
            eventData[key] = value;
        }
    }

    return eventData;
}

export function normalizeAddress(address: string): string {
    return address.toLowerCase();
}

export function toNumber(value: string | bigint): number {
    if (typeof value === "bigint") {
        return Number(value);
    }
    return parseInt(value, 10);
}

export function toString(value: string | bigint): string {
    if (typeof value === "bigint") {
        return value.toString();
    }
    return value;
}
