import { create } from 'zustand';
import {
    fetchDailyAttendance,
    fetchMonthlyAttendance,
    fetchOverallAttendance,
} from '../services/attendanceApi';
import {
    cacheResult,
    getCachedResult,
    getProfile as getProfileFromStore,
    isCacheFresh,
    saveProfile as saveProfileToStore,
    deleteAllUserData,
} from '../services/storage';
import { resetRateLimiter } from '../services/rateLimiter';
import {
    AppError,
    AttendanceResult,
    StudentInfo,
    StudentProfile,
    SubjectRow,
    ViewMode,
} from '../types';

// ─── Cooldown duration (30 seconds) ───
const COOLDOWN_MS = 30_000;

interface AppState {
    // Profile
    profile: StudentProfile | null;
    isOnboarded: boolean;

    // Attendance
    attendanceResult: AttendanceResult | null;
    viewMode: ViewMode;
    selectedDate: string; // YYYY-MM-DD

    // UI state
    isLoading: boolean;
    error: AppError | null;
    isCachedData: boolean;
    lastFetchAttempt: number; // timestamp of last fetch attempt
    fetchAttempts: number; // count of consecutive quick fetches
    cooldownEnd: number; // timestamp when cooldown expires (for visible countdown)

    // Actions
    loadProfile: () => Promise<void>;
    setProfile: (profile: StudentProfile) => Promise<void>;
    setViewMode: (mode: ViewMode) => void;
    setSelectedDate: (date: string) => void;
    fetchAttendance: (forceRefresh?: boolean) => Promise<void>;
    clearError: () => void;
    deleteAllData: () => Promise<void>;
}

function getTodayString(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const useAppStore = create<AppState>((set, get) => ({
    // Initial state
    profile: null,
    isOnboarded: false,
    attendanceResult: null,
    viewMode: 'overall',
    selectedDate: getTodayString(),
    isLoading: false,
    error: null,
    isCachedData: false,
    lastFetchAttempt: 0,
    fetchAttempts: 0,
    cooldownEnd: 0,

    // ─── Load profile from secure storage ───
    loadProfile: async () => {
        const profile = await getProfileFromStore();
        set({ profile, isOnboarded: !!profile });
    },

    // ─── Save profile ───
    setProfile: async (profile: StudentProfile) => {
        await saveProfileToStore(profile);
        set({ profile, isOnboarded: true });
    },

    // ─── View mode ───
    setViewMode: (mode: ViewMode) => {
        set({ viewMode: mode });
    },

    setSelectedDate: (date: string) => {
        set({ selectedDate: date });
    },

    // ─── Fetch attendance (with cache-first, cooldown, & concurrency guard) ───
    fetchAttendance: async (forceRefresh = false) => {
        const { profile, viewMode, selectedDate, isLoading, cooldownEnd, lastFetchAttempt, fetchAttempts } = get();
        if (!profile) return;

        // Prevent concurrent fetches
        if (isLoading) return;

        // Enforce visible cooldown
        const now = Date.now();
        if (forceRefresh && now < cooldownEnd) {
            return;
        }

        // Cache-first: if not forcing refresh, check if cache is still fresh
        if (!forceRefresh) {
            const fresh = await isCacheFresh(viewMode);
            if (fresh) {
                const cached = await getCachedResult(viewMode);
                if (cached) {
                    set({
                        attendanceResult: cached,
                        isCachedData: true,
                        error: null,
                    });
                    return;
                }
            }
        }

        // Determine if we should trigger a cooldown on this manual fetch
        // If the user fetches manually twice within 15 seconds, trigger a 30s cooldown
        let newFetchAttempts = fetchAttempts;
        let newCooldownEnd = cooldownEnd;

        if (forceRefresh) {
            if (now - lastFetchAttempt < 15000) {
                newFetchAttempts += 1;
            } else {
                newFetchAttempts = 1;
            }

            if (newFetchAttempts >= 2) {
                newCooldownEnd = now + COOLDOWN_MS;
                newFetchAttempts = 0; // reset after triggering cooldown
            }
        }

        set({
            isLoading: true,
            error: null,
            isCachedData: false,
            lastFetchAttempt: now,
            fetchAttempts: newFetchAttempts,
            cooldownEnd: newCooldownEnd,
        });

        try {
            let result: { student: StudentInfo; subjects: SubjectRow[] };

            switch (viewMode) {
                case 'daily':
                    result = await fetchDailyAttendance(profile.rollNumber, profile.semester, selectedDate);
                    break;
                case 'monthly':
                    result = await fetchMonthlyAttendance(profile.rollNumber, profile.semester);
                    break;
                case 'overall':
                default:
                    result = await fetchOverallAttendance(profile.rollNumber, profile.semester);
                    break;
            }

            const totalClasses = result.subjects.reduce((sum, s) => sum + s.totalClasses, 0);
            const totalPresent = result.subjects.reduce((sum, s) => sum + s.totalPresent, 0);
            const overallPercentage = totalClasses > 0
                ? Math.round((totalPresent / totalClasses) * 10000) / 100
                : 0;

            const attendanceResult: AttendanceResult = {
                fetchedAt: new Date().toISOString(),
                viewMode,
                date: viewMode === 'daily' ? selectedDate : undefined,
                student: result.student,
                subjects: result.subjects,
                overallPercentage,
            };

            // Cache the result
            await cacheResult(attendanceResult);

            set({
                attendanceResult,
                isLoading: false,
                isCachedData: false,
            });
        } catch (err: any) {
            // Handle rate limit / abuse errors gracefully — don't overwrite existing results
            if (err?.type === 'RATE_LIMIT_ERROR' || err?.type === 'ABUSE_ERROR') {
                const { attendanceResult } = get();
                set({
                    isLoading: false,
                    error: err as AppError,
                    // Keep existing data visible if we have it
                    isCachedData: !!attendanceResult,
                });
                return;
            }

            // Try to load cached data on other errors
            const cached = await getCachedResult(viewMode);
            if (cached) {
                set({
                    attendanceResult: cached,
                    isLoading: false,
                    error: err as AppError,
                    isCachedData: true,
                });
            } else {
                set({
                    isLoading: false,
                    error: err as AppError,
                });
            }
        }
    },

    clearError: () => {
        set({ error: null });
    },

    // ─── Delete all user data ───
    deleteAllData: async () => {
        await deleteAllUserData();
        await resetRateLimiter();
        set({
            profile: null,
            isOnboarded: false,
            attendanceResult: null,
            viewMode: 'overall',
            selectedDate: getTodayString(),
            isLoading: false,
            error: null,
            isCachedData: false,
            lastFetchAttempt: 0,
            fetchAttempts: 0,
            cooldownEnd: 0,
        });
    },
}));
