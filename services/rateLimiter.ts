/**
 * Rate Limiter & Request Deduplication for AttendEase
 *
 * Provides:
 * 1. Persistent daily rate limit: max 50 requests per day (AsyncStorage)
 * 2. In-memory sliding window: max 8 requests per 60s (burst protection)
 * 3. In-flight deduplication: returns same Promise for duplicate concurrent calls
 * 4. Anti-scraping: blocks if >10 unique roll numbers are queried
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError } from '../types';

// ─── Configuration ───
const MAX_REQUESTS_PER_MINUTE = 8;
const WINDOW_MS = 60_000;
const MAX_DAILY_REQUESTS = 50;
const MAX_UNIQUE_ROLLS = 10;

// ─── AsyncStorage Keys ───
const DAILY_COUNT_KEY = '@ae_daily_requests';
const UNIQUE_ROLLS_KEY = '@ae_unique_rolls';
const LAST_FETCH_KEY = '@ae_last_fetch';

// ─── In-memory State ───
const requestTimestamps: number[] = [];
const inflightMap = new Map<string, Promise<any>>();

// ─── Error factories ───
function createRateLimitError(): AppError {
    return {
        type: 'RATE_LIMIT_ERROR',
        message: 'Too many requests. Please wait a moment before trying again.',
        recoveryAction: 'retry',
    };
}

function createDailyLimitError(count: number): AppError {
    return {
        type: 'RATE_LIMIT_ERROR',
        message: `Daily request limit reached (${count}/${MAX_DAILY_REQUESTS}). Try again tomorrow.`,
        recoveryAction: 'retry',
    };
}

function createAbuseError(): AppError {
    return {
        type: 'ABUSE_ERROR',
        message: 'Suspicious activity detected. API access has been temporarily disabled.',
        recoveryAction: 'retry',
    };
}

// ─── Daily counter helpers ───
interface DailyCount {
    count: number;
    date: string;
}

function getTodayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

async function getDailyCount(): Promise<DailyCount> {
    try {
        const raw = await AsyncStorage.getItem(DAILY_COUNT_KEY);
        if (!raw) return { count: 0, date: getTodayString() };
        const data: DailyCount = JSON.parse(raw);
        // Reset if it's a new day
        if (data.date !== getTodayString()) {
            return { count: 0, date: getTodayString() };
        }
        return data;
    } catch {
        return { count: 0, date: getTodayString() };
    }
}

async function incrementDailyCount(): Promise<number> {
    const current = await getDailyCount();
    const updated: DailyCount = { count: current.count + 1, date: getTodayString() };
    await AsyncStorage.setItem(DAILY_COUNT_KEY, JSON.stringify(updated));
    return updated.count;
}

// ─── Unique roll number tracking (anti-scraping) ───
interface UniqueRolls {
    rolls: string[];
    date: string;
}

async function trackRollNumber(rollNo: string): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(UNIQUE_ROLLS_KEY);
        let data: UniqueRolls = raw ? JSON.parse(raw) : { rolls: [], date: getTodayString() };

        // Reset if new day
        if (data.date !== getTodayString()) {
            data = { rolls: [], date: getTodayString() };
        }

        if (!data.rolls.includes(rollNo)) {
            data.rolls.push(rollNo);
        }

        if (data.rolls.length > MAX_UNIQUE_ROLLS) {
            await AsyncStorage.setItem(UNIQUE_ROLLS_KEY, JSON.stringify(data));
            throw createAbuseError();
        }

        await AsyncStorage.setItem(UNIQUE_ROLLS_KEY, JSON.stringify(data));
    } catch (err: any) {
        if (err?.type === 'ABUSE_ERROR') throw err;
        // Silently fail for storage issues
    }
}

// ─── Last fetch timestamp ───
async function recordLastFetch(): Promise<void> {
    await AsyncStorage.setItem(LAST_FETCH_KEY, new Date().toISOString());
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

// ─── Check & enforce in-memory burst limit ───
function checkBurstLimit(): void {
    pruneWindow();
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
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
 * - Enforces burst rate limit (8/60s) and daily limit (50/day)
 * - Tracks unique roll numbers for anti-scraping
 * - Deduplicates identical in-flight requests
 */
export async function rateLimitedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    rollNo?: string
): Promise<T> {
    // 1. Check burst rate limit
    checkBurstLimit();

    // 2. Check daily limit
    const daily = await getDailyCount();
    if (daily.count >= MAX_DAILY_REQUESTS) {
        throw createDailyLimitError(daily.count);
    }

    // 3. Track roll number for anti-scraping
    if (rollNo) {
        await trackRollNumber(rollNo);
    }

    // 4. Deduplicate: if same request is already in-flight, return its Promise
    const existing = inflightMap.get(key);
    if (existing) {
        return existing as Promise<T>;
    }

    // 5. Execute
    const execute = async (): Promise<T> => {
        recordRequest();
        await incrementDailyCount();
        await recordLastFetch();
        return fetchFn();
    };

    const promise = execute().finally(() => {
        inflightMap.delete(key);
    });

    inflightMap.set(key, promise);
    return promise;
}

// ─── Public getters for UI transparency ───

export async function getDailyRequestCount(): Promise<{ count: number; max: number }> {
    const daily = await getDailyCount();
    return { count: daily.count, max: MAX_DAILY_REQUESTS };
}

export async function getLastFetchTime(): Promise<string | null> {
    return AsyncStorage.getItem(LAST_FETCH_KEY);
}

/**
 * Reset rate limiter state (useful for data deletion / logout)
 */
export async function resetRateLimiter(): Promise<void> {
    requestTimestamps.length = 0;
    inflightMap.clear();
    await AsyncStorage.multiRemove([DAILY_COUNT_KEY, UNIQUE_ROLLS_KEY, LAST_FETCH_KEY]);
}
