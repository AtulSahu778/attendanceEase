/**
 * Rate Limiter & Request Deduplication for AttendanceEase
 *
 * Provides:
 * 1. Global rate limit: max N requests per sliding window
 * 2. Per-endpoint cooldown: minimum gap between identical requests
 * 3. In-flight deduplication: returns same Promise for duplicate concurrent calls
 * 4. Retry with exponential backoff on transient errors
 */

import { AppError } from '../types';

// ─── Configuration ───
const MAX_REQUESTS = 5;          // max requests in the sliding window
const WINDOW_MS = 60_000;        // sliding window size (60 seconds)
const COOLDOWN_MS = 30_000;      // per-endpoint cooldown (30 seconds)
const MAX_RETRIES = 2;           // retry attempts on transient errors
const BASE_DELAY_MS = 2_000;     // base delay for exponential backoff

// ─── State ───
const requestTimestamps: number[] = [];                         // global sliding window
const lastRequestMap = new Map<string, number>();                // per-key cooldown timestamps
const inflightMap = new Map<string, Promise<any>>();             // in-flight deduplication

// ─── Rate-limit error ───
function createRateLimitError(): AppError {
    return {
        type: 'RATE_LIMIT_ERROR',
        message: 'Too many requests. Please wait a moment before trying again.',
        recoveryAction: 'retry',
    };
}

function createCooldownError(remainingSec: number): AppError {
    return {
        type: 'RATE_LIMIT_ERROR',
        message: `Please wait ${remainingSec}s before refreshing again.`,
        recoveryAction: 'retry',
    };
}

// ─── Build a unique key for deduplication ───
export function buildRequestKey(
    endpoint: string,
    rollNo: string,
    semester: string,
    date?: string
): string {
    return `${endpoint}|${rollNo}|${semester}|${date || ''}`;
}

// ─── Prune timestamps older than the window ───
function pruneWindow(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) {
        requestTimestamps.shift();
    }
}

// ─── Check & enforce global rate limit ───
function checkGlobalLimit(): void {
    pruneWindow();
    if (requestTimestamps.length >= MAX_REQUESTS) {
        throw createRateLimitError();
    }
}

// ─── Check & enforce per-endpoint cooldown ───
function checkCooldown(key: string): void {
    const lastTime = lastRequestMap.get(key);
    if (lastTime) {
        const elapsed = Date.now() - lastTime;
        if (elapsed < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
            throw createCooldownError(remaining);
        }
    }
}

// ─── Record a successful request ───
function recordRequest(key: string): void {
    requestTimestamps.push(Date.now());
    lastRequestMap.set(key, Date.now());
}

// ─── Sleep helper ───
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Is the error transient (worth retrying)? ───
function isTransientError(err: any): boolean {
    if (err && typeof err === 'object' && 'type' in err) {
        return err.type === 'NETWORK_ERROR' || err.type === 'TIMEOUT_ERROR';
    }
    return false;
}

/**
 * Execute an API call through the rate limiter.
 *
 * - Enforces global rate limit and per-endpoint cooldown
 * - Deduplicates identical in-flight requests
 * - Retries transient errors with exponential backoff
 */
export async function rateLimitedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>
): Promise<T> {
    // 1. Check global rate limit
    checkGlobalLimit();

    // 2. Check per-endpoint cooldown
    checkCooldown(key);

    // 3. Deduplicate: if same request is already in-flight, return its Promise
    const existing = inflightMap.get(key);
    if (existing) {
        return existing as Promise<T>;
    }

    // 4. Execute with retry logic
    const execute = async (): Promise<T> => {
        let lastError: any;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                // Record on first attempt only
                if (attempt === 0) {
                    recordRequest(key);
                }

                const result = await fetchFn();
                return result;
            } catch (err: any) {
                lastError = err;

                // Only retry on transient errors
                if (!isTransientError(err) || attempt >= MAX_RETRIES) {
                    throw err;
                }

                // Exponential backoff: 2s, 4s
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                await sleep(delay);
            }
        }

        throw lastError;
    };

    // Store the in-flight promise for deduplication
    const promise = execute().finally(() => {
        inflightMap.delete(key);
    });

    inflightMap.set(key, promise);
    return promise;
}

/**
 * Reset rate limiter state (useful for testing or logout)
 */
export function resetRateLimiter(): void {
    requestTimestamps.length = 0;
    lastRequestMap.clear();
    inflightMap.clear();
}
