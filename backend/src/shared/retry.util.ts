export async function retryAsync<T>(
    fn: () => Promise<T>,
    options: { retries?: number; delayMs?: number } = {},
): Promise<T> {
    const { retries = 2, delayMs = 500 } = options;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < retries) {
                const suggestedMs = extractRetryDelayMs(error);
                await new Promise((resolve) => setTimeout(resolve, suggestedMs ?? delayMs * (attempt + 1)));
            }
        }
    }
    throw lastError;
}

function extractRetryDelayMs(error: unknown): number | null {
    try {
        const message = error instanceof Error ? error.message : String(error);
        const match = message.match(/"retryDelay":"([\d.]+)s"/);
        if (match) {
            const ms = Math.ceil(parseFloat(match[1]) * 1000) + 500;
            if (ms > 10000)
                return null;
            return ms;
        }
    } catch {
    }
    return null;
}