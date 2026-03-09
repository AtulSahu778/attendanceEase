import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AttendanceResult, StudentProfile } from '../types';

const PROFILE_KEY = 'student_profile';
const CACHE_KEY_PREFIX = 'attendance_cache_';

// ─── Profile Storage (AsyncStorage) ───
// We use AsyncStorage instead of SecureStore because SecureStore.deleteItemAsync
// is unreliable on some Android builds and Expo Go, causing delete to be a no-op.
// Roll number + semester aren't sensitive secrets requiring hardware encryption.

export async function saveProfile(profile: StudentProfile): Promise<void> {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function getProfile(): Promise<StudentProfile | null> {
    try {
        const data = await AsyncStorage.getItem(PROFILE_KEY);
        if (!data) return null;
        return JSON.parse(data) as StudentProfile;
    } catch {
        return null;
    }
}

export async function clearProfile(): Promise<void> {
    await AsyncStorage.removeItem(PROFILE_KEY);
}

// ─── Attendance Cache (AsyncStorage) ───

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
// Since profile is now stored in AsyncStorage, a single clear() removes everything.
// On web we also clear raw localStorage to wipe any data written by the old SecureStore shim.
export async function deleteAllUserData(): Promise<void> {
    await AsyncStorage.clear();
    if (Platform.OS === 'web') {
        try { localStorage.clear(); } catch { /* ignore */ }
    }
}

// ─── Cache freshness check ───

const CACHE_MAX_AGE: Record<string, number> = {
    overall: 5 * 60_000,   // 5 minutes
    monthly: 5 * 60_000,   // 5 minutes
    daily: 10 * 60_000,   // 10 minutes
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
