import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AttendanceResult, StudentProfile } from '../types';

// ─── Namespaced Keys ───
// All AttendEase keys use the @ae_ prefix to avoid colliding with other libraries.
const PROFILE_KEY = '@ae_profile';
const CACHE_KEY_PREFIX = '@ae_cache_';
const ORIGINAL_ROLL_KEY = '@ae_original_roll';

// Legacy keys (for migration cleanup on web)
const LEGACY_KEYS = ['student_profile', 'attendance_cache_overall', 'attendance_cache_daily', 'attendance_cache_monthly'];

// Complete list of all AttendEase keys (for targeted deletion)
const ALL_AE_KEYS = [
    PROFILE_KEY,
    `${CACHE_KEY_PREFIX}overall`,
    `${CACHE_KEY_PREFIX}daily`,
    `${CACHE_KEY_PREFIX}monthly`,
    ORIGINAL_ROLL_KEY,
    '@ae_daily_requests',
    '@ae_unique_rolls',
    '@ae_last_fetch',
];

// ─── Profile Storage ───

export async function saveProfile(profile: StudentProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    // Store the original roll number once (Issue 1: single roll per install)
    const existingOriginal = await AsyncStorage.getItem(ORIGINAL_ROLL_KEY);
    if (!existingOriginal) {
        await AsyncStorage.setItem(ORIGINAL_ROLL_KEY, profile.rollNumber);
    }
}

export async function getProfile(): Promise<StudentProfile | null> {
    try {
        const data = await AsyncStorage.getItem(PROFILE_KEY);
        if (!data) {
            // Migration: try reading from legacy key
            const legacy = await AsyncStorage.getItem('student_profile');
            if (legacy) {
                // Migrate to new key and clean up
                await AsyncStorage.setItem(PROFILE_KEY, legacy);
                await AsyncStorage.removeItem('student_profile');
                return JSON.parse(legacy) as StudentProfile;
            }
            return null;
        }
        return JSON.parse(data) as StudentProfile;
    } catch {
        return null;
    }
}

export async function clearProfile(): Promise<void> {
    await AsyncStorage.removeItem(PROFILE_KEY);
}

export async function getOriginalRollNumber(): Promise<string | null> {
    return AsyncStorage.getItem(ORIGINAL_ROLL_KEY);
}

// ─── Attendance Cache ───

export async function cacheResult(result: AttendanceResult): Promise<void> {
    const key = `${CACHE_KEY_PREFIX}${result.viewMode}`;
    await AsyncStorage.setItem(key, JSON.stringify(result));
}

export async function getCachedResult(viewMode: string): Promise<AttendanceResult | null> {
    try {
        const key = `${CACHE_KEY_PREFIX}${viewMode}`;
        const data = await AsyncStorage.getItem(key);
        if (!data) return null;
        return JSON.parse(data) as AttendanceResult;
    } catch {
        return null;
    }
}

export async function getLastCacheTimestamp(): Promise<string | null> {
    try {
        const overallData = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}overall`);
        if (!overallData) return null;
        const result = JSON.parse(overallData) as AttendanceResult;
        return result.fetchedAt;
    } catch {
        return null;
    }
}

export async function clearAllCache(): Promise<void> {
    const keys = ['overall', 'daily', 'monthly'].map((m) => `${CACHE_KEY_PREFIX}${m}`);
    await AsyncStorage.multiRemove(keys);
}

// ─── Full data deletion ───
// Removes only AttendEase-namespaced keys — does NOT wipe other libraries' data.
export async function deleteAllUserData(): Promise<void> {
    await AsyncStorage.multiRemove(ALL_AE_KEYS);

    // On web, also clean up legacy localStorage entries from older versions
    if (Platform.OS === 'web') {
        try {
            LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
        } catch { /* ignore */ }
    }
}

// ─── Cache freshness check ───

const CACHE_MAX_AGE: Record<string, number> = {
    overall: 5 * 60_000,   // 5 minutes
    monthly: 5 * 60_000,   // 5 minutes
    daily: 10 * 60_000,    // 10 minutes
};

export async function isCacheFresh(viewMode: string): Promise<boolean> {
    try {
        const key = `${CACHE_KEY_PREFIX}${viewMode}`;
        const data = await AsyncStorage.getItem(key);
        if (!data) return false;

        const result = JSON.parse(data) as AttendanceResult;
        if (!result.fetchedAt) return false;

        const age = Date.now() - new Date(result.fetchedAt).getTime();
        const maxAge = CACHE_MAX_AGE[viewMode] ?? 5 * 60_000;
        return age < maxAge;
    } catch {
        return false;
    }
}
