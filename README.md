# AttendEase System Workflow Documentation

## Overview
AttendEase is a React Native mobile application built with Expo Router that helps students track their attendance from the St. Xavier's College Ranchi portal. The app provides a premium iOS 17-inspired dark UI with real-time attendance fetching, caching, and rate limiting.

## Tech Stack
- **Framework**: React Native (0.76.9) with Expo (~52.0.0)
- **Routing**: Expo Router (~4.0.0) for file-based navigation
- **State Management**: Zustand (^4.5.0) for global state
- **Storage**: 
  - AsyncStorage for attendance cache
  - Expo SecureStore for encrypted profile data
- **UI**: NativeWind (^4.0.1) with custom glass morphism components
- **Styling**: Tailwind CSS + StyleSheet API
- **TypeScript**: Full type safety across the codebase

## Architecture Overview

### Directory Structure
```
app/                    # Screen components (file-based routing)
├── _layout.tsx        # Root layout with navigation setup
├── index.tsx          # Entry redirect logic
├── setup.tsx          # Onboarding screen
├── home.tsx           # Main dashboard
├── result.tsx         # Attendance results display
└── settings.tsx       # Profile & app settings

services/              # Business logic layer
├── attendanceApi.ts   # API client for college portal
├── rateLimiter.ts     # Request throttling & deduplication
└── storage.ts         # Persistent data management

store/                 # State management
└── useAppStore.ts     # Zustand store with all app state

types/                 # TypeScript definitions
└── index.ts           # Shared types & interfaces

components/            # Reusable UI components
└── Donation.tsx       # Donation banner/modal

assets/                # Static resources
├── fonts/
├── images/
└── favicon_io/
```

## Core System Workflows

### 1. Application Initialization Flow

```
App Launch
    ↓
_layout.tsx loads
    ↓
useAppStore.loadProfile() called
    ↓
Profile loaded from SecureStore
    ↓
SplashScreen hidden
    ↓
Navigation guard checks isOnboarded
    ↓
Route to /setup OR /home
```

**Key Components:**
- `_layout.tsx`: Root layout managing navigation and global footer
- `useAppStore.loadProfile()`: Loads encrypted profile from device storage
- Navigation guard: Redirects based on onboarding status

### 2. Onboarding Flow (Setup Screen)

```
User opens app (first time)
    ↓
Redirected to /setup
    ↓
User enters:
  - Roll Number (validated, uppercase)
  - Semester (Roman numerals I-VIII)
  - Display Name (optional)
    ↓
Validation checks:
  - Roll number not empty
  - Valid format (alphanumeric)
    ↓
Profile saved to SecureStore (encrypted)
    ↓
isOnboarded = true
    ↓
Navigate to /home
```

**Validation Rules:**
- Roll number: Alphanumeric, max 20 chars, uppercase
- Semester: Must match predefined options (I-VIII)
- Display name: Optional, no validation

**Storage:**
```typescript
interface StudentProfile {
  rollNumber: string;
  semester: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3. Attendance Fetching Workflow

```
User clicks "Check Attendance"
    ↓
useAppStore.fetchAttendance() triggered
    ↓
Rate limiter checks:
  - Global limit (5 req/60s)
  - Per-endpoint cooldown (30s)
    ↓
Request deduplication check
    ↓
API call based on viewMode:
  - overall → fetchOverallAttendance()
  - daily → fetchDailyAttendance()
  - monthly → fetchMonthlyAttendance()
    ↓
Response validation & parsing
    ↓
Calculate overall percentage
    ↓
Cache result to AsyncStorage
    ↓
Update UI with new data
    ↓
Navigate to /result

[If error occurs]
    ↓
Try loading cached data
    ↓
Display cached data with warning banner
    OR
Display error with retry option
```

### 4. API Communication Layer

**Endpoint Structure:**
```
BASE_URL (Platform-dependent):
  - Web: http://localhost:3001/api/Student (via proxy)
  - Native: https://sxcran.ac.in/Student (direct)

Endpoints:
  - POST /showOverallAttendance
  - POST /showDailyAttendance  
  - POST /showMonthlyAttendance
```

**Request Flow:**
```
attendanceApi.ts
    ↓
Input validation (roll number, semester, date)
    ↓
rateLimiter.rateLimitedFetch()
    ↓
Check global rate limit
    ↓
Check per-endpoint cooldown
    ↓
Deduplicate in-flight requests
    ↓
fetchWithTimeout() (12s timeout)
    ↓
Retry logic (max 2 retries on transient errors)
    ↓
Parse & transform response
    ↓
Return structured data
```

**Error Handling:**
- Network errors → Retry with exponential backoff
- Timeout errors → Retry with exponential backoff
- Empty results → Show user-friendly message
- Parse errors → Fallback to cached data
- Rate limit errors → Show cooldown timer

### 5. Rate Limiting System

**Three-Layer Protection:**

1. **Global Rate Limit**
   - Max 5 requests per 60-second sliding window
   - Prevents server overload

2. **Per-Endpoint Cooldown**
   - 30-second minimum gap between identical requests
   - Prevents duplicate fetches

3. **In-Flight Deduplication**
   - Returns same Promise for concurrent identical requests
   - Prevents race conditions

**Implementation:**
```typescript
// State tracking
requestTimestamps: number[]           // Global window
lastRequestMap: Map<string, number>   // Per-endpoint cooldown
inflightMap: Map<string, Promise>     // Deduplication
```

### 6. Caching Strategy

**Cache Layers:**
- **Profile**: SecureStore (encrypted, persistent)
- **Attendance**: AsyncStorage (unencrypted, per view mode)

**Cache Keys:**
```
Profile: "student_profile"
Attendance: "attendance_cache_{viewMode}"
```

**Freshness Rules:**
- Overall: 5 minutes
- Monthly: 5 minutes
- Daily: 10 minutes

**Cache Behavior:**
```
Fetch Request
    ↓
Check cache freshness
    ↓
If fresh → Return cached data
    ↓
If stale → Fetch new data
    ↓
On error → Fallback to cached data (with warning)
```

### 7. View Mode System

**Three View Modes:**

1. **Overall**
   - Shows cumulative attendance across all subjects
   - Aggregates total classes and present count
   - Default view mode

2. **Daily**
   - Shows attendance for a specific date
   - User can select custom date (YYYY-MM-DD)
   - Aggregates multiple periods per subject

3. **Monthly**
   - Shows attendance aggregated by month
   - Sums classes across all months per subject

**Data Transformation:**
```
API Response (snake_case)
    ↓
Parse & validate
    ↓
Aggregate by subject
    ↓
Calculate percentages
    ↓
Transform to SubjectRow[]
    ↓
Calculate overall percentage
    ↓
Store as AttendanceResult
```

### 8. State Management (Zustand)

**Store Structure:**
```typescript
interface AppState {
  // Profile
  profile: StudentProfile | null;
  isOnboarded: boolean;

  // Attendance
  attendanceResult: AttendanceResult | null;
  viewMode: ViewMode;
  selectedDate: string;

  // UI State
  isLoading: boolean;
  error: AppError | null;
  isCachedData: boolean;

  // Actions
  loadProfile()
  setProfile()
  setViewMode()
  setSelectedDate()
  fetchAttendance()
  clearError()
}
```

**State Flow:**
```
Component triggers action
    ↓
Zustand action updates state
    ↓
Service layer called (if needed)
    ↓
State updated with result
    ↓
All subscribed components re-render
```

### 9. UI Animation System

**Animation Types:**

1. **Press Scale**
   - All interactive elements compress on touch
   - Scale: 1 → 0.96 (120ms) → 1 (spring)
   - Creates tactile feedback

2. **Staggered Entrance**
   - Screen elements fade + slide in
   - Opacity: 0 → 1, TranslateY: 16 → 0
   - 480ms duration, 50ms stagger per element

3. **Progress Bars**
   - Width animates from 0% to percentage
   - 800ms duration, 300ms delay + 50ms stagger
   - Color-coded with glow effects

**Implementation Pattern:**
```typescript
function usePressScale(to = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.timing(...).start();
  const onPressOut = () => Animated.spring(...).start();
  return { scale, onPressIn, onPressOut };
}
```

### 10. Error Recovery System

**Error Types & Recovery Actions:**

| Error Type | User Message | Recovery Action |
|------------|--------------|-----------------|
| NETWORK_ERROR | Connection issue | Retry button |
| TIMEOUT_ERROR | Request timed out | Retry button |
| EMPTY_RESULT | No data found | Check settings |
| PARSE_ERROR | Invalid response | Retry button |
| RATE_LIMIT_ERROR | Too many requests | Wait timer |
| UNKNOWN_ERROR | Unexpected error | Retry button |

**Recovery Flow:**
```
Error occurs
    ↓
Check for cached data
    ↓
If cached exists:
  - Display cached data
  - Show warning banner
  - Offer retry option
    ↓
If no cache:
  - Display error message
  - Show recovery action
  - Clear error on retry
```

## Data Flow Diagrams

### Complete Attendance Fetch Flow
```
[User Action] → [Store Action] → [Rate Limiter] → [API Client]
                                                        ↓
[UI Update] ← [Store Update] ← [Cache Write] ← [Response Parse]
     ↓
[Navigate to Result]
```

### Profile Management Flow
```
[Setup Screen] → [Validation] → [Store Action] → [SecureStore Write]
                                                        ↓
[Home Screen] ← [Navigation] ← [State Update] ← [Encryption]
```

## Security Considerations

1. **Profile Encryption**
   - Roll numbers stored in SecureStore (Keychain/Keystore)
   - Platform-specific secure storage
   - No cloud sync

2. **API Communication**
   - Direct HTTPS to college portal (native)
   - Local proxy for web (CORS bypass)
   - No third-party servers

3. **Input Validation**
   - All user inputs sanitized
   - SQL injection prevention
   - XSS protection

4. **Rate Limiting**
   - Prevents abuse
   - Protects college portal
   - Client-side enforcement

## Platform-Specific Behavior

### Web
- Uses localStorage for profile (no SecureStore)
- Requires local proxy server (proxy.js)
- CORS bypass via http://localhost:3001

### Native (iOS/Android)
- Uses SecureStore for profile encryption
- Direct API calls to college portal
- No CORS restrictions

## Performance Optimizations

1. **Request Deduplication**
   - Prevents duplicate concurrent requests
   - Shares Promise across components

2. **Caching Strategy**
   - Reduces API calls
   - Instant data display
   - Offline support

3. **Lazy Loading**
   - Components load on demand
   - Reduced initial bundle size

4. **Native Driver Animations**
   - GPU-accelerated animations
   - 60fps performance
   - Smooth interactions

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios
npm run android
npm run web
```

### Web Development (with proxy)
```bash
# Terminal 1: Start proxy server
node proxy.js

# Terminal 2: Start Expo
npm run web
```

## Future Enhancement Opportunities

1. **Notifications**
   - Push notifications for low attendance
   - Daily attendance reminders

2. **Analytics**
   - Attendance trends
   - Prediction algorithms
   - Subject-wise insights

3. **Multi-Profile**
   - Support multiple students
   - Profile switching

4. **Offline Mode**
   - Full offline functionality
   - Sync when online

5. **Export Features**
   - PDF reports
   - CSV export
   - Share functionality

## Troubleshooting Guide

### Common Issues

1. **"No data found" error**
   - Verify roll number format
   - Check semester selection
   - Ensure college portal is accessible

2. **Rate limit errors**
   - Wait 30 seconds between requests
   - Clear app cache if persistent

3. **Cached data warning**
   - Network connectivity issue
   - College portal down
   - Retry when connection restored

4. **Web CORS errors**
   - Ensure proxy server is running
   - Check proxy.js configuration
   - Verify localhost:3001 is accessible

---

**Last Updated**: March 7, 2026
**Version**: 1.0.0
**Maintainer**: Atul Sahu (@AtulSahu778)
