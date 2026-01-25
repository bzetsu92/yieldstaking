export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
    maxDelayMs: number = 30000,
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));

            if (attempt === maxRetries) {
                throw lastError;
            }

            const delay = Math.min(
                initialDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
                maxDelayMs,
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
