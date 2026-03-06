// ─── Student Profile (stored in SecureStore) ───
export interface StudentProfile {
    rollNumber: string;        // e.g. "24VBIT057091"
    semester: string;          // Roman numeral: "I"–"VIII"
    displayName?: string;      // Optional greeting name
    createdAt: string;         // ISO8601
    updatedAt: string;         // ISO8601
}

// ─── View mode ───
export type ViewMode = 'overall' | 'daily' | 'monthly';

// ─── Parsed subject row ───
export interface SubjectRow {
    subjectCode: string;
    subjectTitle: string;
    totalClasses: number;
    totalPresent: number;
    percentage: number;
    period?: string;  // Only present in daily view (e.g. "10:50 - 11:35")
}

// ─── Student info returned from the portal ───
export interface StudentInfo {
    classRollNumber: string;
    name: string;
    semester: string;
    courseName: string;
}

// ─── Full attendance result (also used for cache) ───
export interface AttendanceResult {
    fetchedAt: string;         // ISO8601
    viewMode: ViewMode;
    date?: string;             // For daily mode "YYYY-MM-DD"
    month?: string;            // For monthly mode "YYYY-MM"
    student: StudentInfo;
    subjects: SubjectRow[];
    overallPercentage: number;
}

// Note: Raw API response types are defined inline in attendanceApi.ts
// The real API uses snake_case: student_Name, classRoll_No, subjectCode, etc.

// ─── Semester conversion ───
export const SEMESTER_OPTIONS = [
    { label: 'Semester I', value: 'I' },
    { label: 'Semester II', value: 'II' },
    { label: 'Semester III', value: 'III' },
    { label: 'Semester IV', value: 'IV' },
    { label: 'Semester V', value: 'V' },
    { label: 'Semester VI', value: 'VI' },
    { label: 'Semester VII', value: 'VII' },
    { label: 'Semester VIII', value: 'VIII' },
];

// ─── Error types ───
export type AppErrorType =
    | 'NETWORK_ERROR'
    | 'TIMEOUT_ERROR'
    | 'EMPTY_RESULT'
    | 'PARSE_ERROR'
    | 'UNKNOWN_ERROR';

export interface AppError {
    type: AppErrorType;
    message: string;
    recoveryAction: 'retry' | 'settings' | 'browser';
}
