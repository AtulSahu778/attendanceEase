import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AttendanceResult, StudentProfile } from '../types';

const PROFILE_KEY = 'student_profile';
const CACHE_KEY_PREFIX = 'attendance_cache_';

// ─── Platform-aware secure storage ───
// On web: uses localStorage (no Keychain available)
// On native: uses expo-secure-store (Keychain / Keystore)

async function secureSet(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
    } else {
        const SecureStore = require('expo-secure-store');
        await SecureStore.setItemAsync(key, value);
    }
}

async function secureGet(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem(key);
    } else {
        const SecureStore = require('expo-secure-store');
        return await SecureStore.getItemAsync(key);
    }
}

async function secureDelete(key: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(key);
    } else {
        const SecureStore = require('expo-secure-store');
        await SecureStore.deleteItemAsync(key);
    }
}

// ─── Profile Storage ───

export async function saveProfile(profile: StudentProfile): Promise<void> {
    await secureSet(PROFILE_KEY, JSON.stringify(profile));
}

export async function getProfile(): Promise<StudentProfile | null> {
    try {
        const data = await secureGet(PROFILE_KEY);
        if (!data) return null;
        return JSON.parse(data) as StudentProfile;
    } catch {
        return null;
    }
}

export async function clearProfile(): Promise<void> {
    await secureDelete(PROFILE_KEY);
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
