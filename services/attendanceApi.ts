import { Platform } from 'react-native';
import { AppError, StudentInfo, SubjectRow, SEMESTER_OPTIONS } from '../types';
import { buildRequestKey, rateLimitedFetch } from './rateLimiter';

// Web uses local CORS proxy; native calls portal directly (no CORS restriction)
const BASE_URL = Platform.OS === 'web'
    ? 'http://localhost:3001/api/Student'
    : 'https://sxcran.ac.in/Student';

const TIMEOUT_MS = 8000;

const HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
};

// ─── Real API response shape (camelCase from server) ───
interface ApiRow {
    examRoll_No: string | null;
    dateOf_attendance: string | null;
    semester: string | null;
    classRoll_No: string | null;
    student_Name: string | null;
    course_Name: string | null;
    subjectCode: string | null;
    subjectTitle: string | null;
    period: string | null;
    attendance: string | null;   // 'P' | 'A' for daily
    monthValue: string | null;
    totalClasses: string | null;
    totalPresent: string | null;
    percentage: string | null;   // "90.00%" with % sign
    errMes: string | null;
}

// ─── Valid semester values ───
const VALID_SEMESTERS = new Set(SEMESTER_OPTIONS.map((s) => s.value));

// ─── Input validation ───

function validateRollNumber(rollNo: string): string {
    const trimmed = rollNo.trim().toUpperCase();

    if (!trimmed) {
        throw createAppError('EMPTY_RESULT', 'Roll number cannot be empty.');
    }

    if (trimmed.length > 20) {
        throw createAppError('EMPTY_RESULT', 'Roll number is too long.');
    }

    // Allow only alphanumeric characters (covers patterns like "24VBIT057091")
    if (!/^[A-Z0-9]+$/.test(trimmed)) {
        throw createAppError('EMPTY_RESULT', 'Roll number contains invalid characters.');
    }

    return trimmed;
}

function validateSemester(semester: string): string {
    const trimmed = semester.trim();
    if (!VALID_SEMESTERS.has(trimmed)) {
        throw createAppError('EMPTY_RESULT', 'Invalid semester. Select a valid semester in Settings.');
    }
    return trimmed;
}

function validateDate(dateStr: string): string {
    const trimmed = dateStr.trim();

    // Must match YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        throw createAppError('EMPTY_RESULT', 'Invalid date format. Use YYYY-MM-DD.');
    }

    const parsed = new Date(trimmed + 'T00:00:00');
    if (isNaN(parsed.getTime())) {
        throw createAppError('EMPTY_RESULT', 'Invalid date. Please enter a real date.');
    }

    // Don't allow future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (parsed > today) {
        throw createAppError('EMPTY_RESULT', 'Cannot check attendance for a future date.');
    }

    return trimmed;
}

// ─── Helpers ───
function parsePct(raw: string | null): number {
    if (!raw) return 0;
    // Handle "90.00%" or "90.00"
    return parseFloat(raw.replace('%', '').trim()) || 0;
}

function cleanTitle(raw: string | null): string {
    return (raw || '').replace(/\s*\[.*?\]\s*$/, '').trim();
}

function buildStudent(row: ApiRow, fallbackSemester: string): StudentInfo {
    return {
        classRollNumber: row.classRoll_No || '',
        name: row.student_Name || '',
        semester: row.semester || fallbackSemester,
        courseName: row.course_Name || '',
    };
}

// ─── Timeout-wrapped fetch ───
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } catch (err: any) {
        if (err.name === 'AbortError') throw createAppError('TIMEOUT_ERROR');
        throw createAppError('NETWORK_ERROR');
    } finally {
        clearTimeout(timer);
    }
}

// ─── Error factory ───
function createAppError(type: AppError['type'], customMessage?: string): AppError {
    const errors: Record<AppError['type'], AppError> = {
        NETWORK_ERROR: {
            type: 'NETWORK_ERROR',
            message: 'Could not reach attendance portal. Please check your connection.',
            recoveryAction: 'retry',
        },
        TIMEOUT_ERROR: {
            type: 'TIMEOUT_ERROR',
            message: 'Request timed out. The portal may be slow or unavailable.',
            recoveryAction: 'retry',
        },
        EMPTY_RESULT: {
            type: 'EMPTY_RESULT',
            message: 'No attendance data found. Check your roll number and semester.',
            recoveryAction: 'settings',
        },
        PARSE_ERROR: {
            type: 'PARSE_ERROR',
            message: 'Could not read portal response. Please try again.',
            recoveryAction: 'retry',
        },
        RATE_LIMIT_ERROR: {
            type: 'RATE_LIMIT_ERROR',
            message: 'Too many requests. Please wait a moment.',
            recoveryAction: 'retry',
        },
        ABUSE_ERROR: {
            type: 'ABUSE_ERROR',
            message: 'Suspicious activity detected. API access temporarily disabled.',
            recoveryAction: 'retry',
        },
        UNKNOWN_ERROR: {
            type: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred. Please try again.',
            recoveryAction: 'retry',
        },
    };
    const error = errors[type];
    if (customMessage) {
        return { ...error, message: customMessage };
    }
    return error;
}

// ─── Name Lookup (used on setup screen — bypasses rate limiter) ───
export async function fetchStudentName(rollNo: string, semester: string): Promise<string | null> {
    try {
        const cleanRoll = validateRollNumber(rollNo);
        const cleanSem = validateSemester(semester);
        const body = `examRollNo=${encodeURIComponent(cleanRoll)}&semester=${encodeURIComponent(cleanSem)}`;
        const response = await fetchWithTimeout(`${BASE_URL}/showOverallAttendance`, {
            method: 'POST',
            headers: HEADERS,
            body,
        });
        if (!response.ok) return null;
        const data: ApiRow[] = await response.json();
        if (!data || data.length === 0) return null;
        const name = data[0].student_Name?.trim();
        return name || null;
    } catch {
        return null;
    }
}

// ─── Overall Attendance ───
export async function fetchOverallAttendance(
    rollNo: string,
    semester: string
): Promise<{ student: StudentInfo; subjects: SubjectRow[] }> {
    // Validate & sanitize inputs
    const cleanRoll = validateRollNumber(rollNo);
    const cleanSem = validateSemester(semester);

    const key = buildRequestKey('overall', cleanRoll, cleanSem);

    return rateLimitedFetch(key, async () => {
        const body = `examRollNo=${encodeURIComponent(cleanRoll)}&semester=${encodeURIComponent(cleanSem)}`;

        const response = await fetchWithTimeout(`${BASE_URL}/showOverallAttendance`, {
            method: 'POST',
            headers: HEADERS,
            body,
        });

        if (!response.ok) throw createAppError('NETWORK_ERROR');

        let data: ApiRow[];
        try { data = await response.json(); } catch { throw createAppError('PARSE_ERROR'); }
        if (!data || data.length === 0) throw createAppError('EMPTY_RESULT');

        const student = buildStudent(data[0], cleanSem);

        const subjects: SubjectRow[] = data.map((item) => ({
            subjectCode: item.subjectCode || '',
            subjectTitle: cleanTitle(item.subjectTitle),
            totalClasses: parseInt(item.totalClasses || '0', 10),
            totalPresent: parseInt(item.totalPresent || '0', 10),
            percentage: parsePct(item.percentage),
        }));

        return { student, subjects };
    }, cleanRoll);
}

// ─── Daily Attendance ───
export async function fetchDailyAttendance(
    rollNo: string,
    semester: string,
    date: string  // YYYY-MM-DD
): Promise<{ student: StudentInfo; subjects: SubjectRow[] }> {
    // Validate & sanitize inputs
    const cleanRoll = validateRollNumber(rollNo);
    const cleanSem = validateSemester(semester);
    const cleanDate = validateDate(date);

    const key = buildRequestKey('daily', cleanRoll, cleanSem, cleanDate);

    return rateLimitedFetch(key, async () => {
        const body = `examRollNo=${encodeURIComponent(cleanRoll)}&semester=${encodeURIComponent(cleanSem)}&adNew=${encodeURIComponent(cleanDate)}`;

        const response = await fetchWithTimeout(`${BASE_URL}/showDailyAttendance`, {
            method: 'POST',
            headers: HEADERS,
            body,
        });

        if (!response.ok) throw createAppError('NETWORK_ERROR');

        let data: ApiRow[];
        try { data = await response.json(); } catch { throw createAppError('PARSE_ERROR'); }
        if (!data || data.length === 0) throw createAppError('EMPTY_RESULT');

        const student = buildStudent(data[0], cleanSem);

        // Aggregate per subject: each row is one period with attendance = 'P' or 'A'
        const subjectMap = new Map<string, { code: string; title: string; total: number; present: number; period: string }>();
        for (const item of data) {
            const code = item.subjectCode || '';
            const isPresent = item.attendance === 'P';
            const existing = subjectMap.get(code);
            if (existing) {
                existing.total += 1;
                if (isPresent) existing.present += 1;
            } else {
                subjectMap.set(code, {
                    code,
                    title: cleanTitle(item.subjectTitle),
                    total: 1,
                    present: isPresent ? 1 : 0,
                    period: item.period || '',
                });
            }
        }

        const subjects: SubjectRow[] = Array.from(subjectMap.values()).map((s) => ({
            subjectCode: s.code,
            subjectTitle: s.title,
            totalClasses: s.total,
            totalPresent: s.present,
            percentage: s.total > 0 ? Math.round((s.present / s.total) * 10000) / 100 : 0,
            period: s.period,
        }));

        return { student, subjects };
    }, cleanRoll);
}

// ─── Monthly Attendance ───
export async function fetchMonthlyAttendance(
    rollNo: string,
    semester: string
): Promise<{ student: StudentInfo; subjects: SubjectRow[] }> {
    // Validate & sanitize inputs
    const cleanRoll = validateRollNumber(rollNo);
    const cleanSem = validateSemester(semester);

    const key = buildRequestKey('monthly', cleanRoll, cleanSem);

    return rateLimitedFetch(key, async () => {
        const body = `examRollNo=${encodeURIComponent(cleanRoll)}&semester=${encodeURIComponent(cleanSem)}`;

        const response = await fetchWithTimeout(`${BASE_URL}/showMonthlyAttendance`, {
            method: 'POST',
            headers: HEADERS,
            body,
        });

        if (!response.ok) throw createAppError('NETWORK_ERROR');

        let data: ApiRow[];
        try { data = await response.json(); } catch { throw createAppError('PARSE_ERROR'); }
        if (!data || data.length === 0) throw createAppError('EMPTY_RESULT');

        const student = buildStudent(data[0], cleanSem);

        // Monthly: aggregate totalClasses + totalPresent per subject across months
        const subjectMap = new Map<string, { code: string; title: string; total: number; present: number }>();
        for (const item of data) {
            const code = item.subjectCode || '';
            const classes = parseInt(item.totalClasses || '0', 10);
            const present = parseInt(item.totalPresent || '0', 10);
            const existing = subjectMap.get(code);
            if (existing) {
                existing.total += classes;
                existing.present += present;
            } else {
                subjectMap.set(code, { code, title: cleanTitle(item.subjectTitle), total: classes, present });
            }
        }

        const subjects: SubjectRow[] = Array.from(subjectMap.values()).map((s) => ({
            subjectCode: s.code,
            subjectTitle: s.title,
            totalClasses: s.total,
            totalPresent: s.present,
            percentage: s.total > 0 ? Math.round((s.present / s.total) * 10000) / 100 : 0,
        }));

        return { student, subjects };
    }, cleanRoll);
}

