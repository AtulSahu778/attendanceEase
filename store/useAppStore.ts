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
} from '../services/storage';
import {
    AppError,
    AttendanceResult,
    StudentInfo,
    StudentProfile,
    SubjectRow,
    ViewMode,
} from '../types';

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
    lastFetchAttempt: number; // timestamp of last fetch attempt (for UI cooldown)

    // Actions
    loadProfile: () => Promise<void>;
    setProfile: (profile: StudentProfile) => Promise<void>;
    setViewMode: (mode: ViewMode) => void;
    setSelectedDate: (date: string) => void;
    fetchAttendance: (forceRefresh?: boolean) => Promise<void>;
    clearError: () => void;
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

    // ─── Fetch attendance (with cache-first & concurrency guard) ───
    fetchAttendance: async (forceRefresh = false) => {
        const { profile, viewMode, selectedDate, isLoading } = get();
        if (!profile) return;

        // Prevent concurrent fetches
        if (isLoading) return;

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

        set({ isLoading: true, error: null, isCachedData: false, lastFetchAttempt: Date.now() });

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
            // Handle rate limit errors gracefully — don't overwrite existing results
            if (err?.type === 'RATE_LIMIT_ERROR') {
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
}));
