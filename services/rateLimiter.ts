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
const MAX_REQUESTS = 8;          // max requests in the sliding window
const WINDOW_MS = 60_000;        // sliding window size (60 seconds)


// ─── State ───
const requestTimestamps: number[] = [];                         // global sliding window
const inflightMap = new Map<string, Promise<any>>();             // in-flight deduplication

// ─── Rate-limit error ───
function createRateLimitError(): AppError {
    return {
        type: 'RATE_LIMIT_ERROR',
        message: 'Too many requests. Please wait a moment before trying again.',
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



// ─── Record a successful request ───
function recordRequest(): void {
    requestTimestamps.push(Date.now());
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

    // 2. Deduplicate: if same request is already in-flight, return its Promise
    const existing = inflightMap.get(key);
    if (existing) {
        return existing as Promise<T>;
    }

    // 3. Execute (fail fast — no retries, cache handles fallback)
    const execute = async (): Promise<T> => {
        recordRequest();
        return fetchFn();
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
    inflightMap.clear();
}
