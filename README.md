# AttendEase

<div align="center">
  <img src="assets/favicon_io/android-chrome-512x512.png" alt="AttendEase Logo" width="120" height="120" />
  
  <p>A premium React Native mobile application built with Expo Router that helps students track their attendance from the St. Xavier's College Ranchi portal.</p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#system-architecture--workflows">Architecture & Workflows</a>
  </p>
</div>

---

## Features

- **Real-Time Tracking**: Get up-to-date attendance metrics directly from the college portal.
- **Three View Modes**: Check your **Overall**, **Daily**, or **Monthly** attendance.
- **Premium UI/UX**: Enjoy a sleek, iOS 17-inspired dark mode interface with glassmorphism components and fluid animations.
- **Smart Caching**: AsyncStorage caches your attendance per view mode for instant loads and offline resilience.
- **Rate Limiting Protection**: A built-in three-layer rate limiter prevents server overload and duplicate requests.
- **Secure Profiles**: User profiles are encrypted using `expo-secure-store`.
- **Error Recovery**: Graceful degradation to cached data with clear warnings when the network fails.

---

## Tech Stack

- **Framework**: React Native (0.76.9) with Expo (~52.0.0)
- **Routing**: Expo Router (~4.0.0)
- **State Management**: Zustand (^4.5.0)
- **Storage**: AsyncStorage (Caching) & Expo SecureStore (Profiles)
- **Styling**: NativeWind (^4.0.1) & Tailwind CSS
- **TypeScript**: Full end-to-end type safety

---

## Getting Started

### Prerequisites

- Node.js installed
- Yarn or npm installed
- Expo Go app on your physical device, or an iOS Simulator / Android Emulator

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AtulSahu778/attendanceEase.git
   cd attendanceEase
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running the App

Start the Expo development server:
```bash
npx expo start
```

- Press `a` to open in an Android emulator.
- Press `i` to open in an iOS simulator.
- Scan the QR code with the Expo Go app to test on a physical device.

#### Web Development (with proxy)
If you want to run the app on the web, you need to start the proxy to bypass CORS restrictions:

```bash
# Terminal 1: Start proxy server
node proxy.js

# Terminal 2: Start Expo web
npx expo start --web
```

---

## System Architecture & Workflows

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

1. **Global Rate Limit**: Max 5 requests per 60-second window.
2. **Per-Endpoint Cooldown**: 30-second minimum gap between identical requests.
3. **In-Flight Deduplication**: Returns same Promise for concurrent identical requests.

### 6. Caching Strategy

**Cache Layers:**
- **Profile**: SecureStore (encrypted, persistent)
- **Attendance**: AsyncStorage (unencrypted, per view mode)

**Freshness Rules:**
- Overall: 5 minutes
- Monthly: 5 minutes
- Daily: 10 minutes

### 7. View Mode System

**Three View Modes:**

1. **Overall**: Shows cumulative attendance across all subjects.
2. **Daily**: Shows attendance for a specific user-selected date (YYYY-MM-DD).
3. **Monthly**: Shows attendance aggregated by month per subject.

### 8. State Management (Zustand)

**Store Structure (`useAppStore.ts`):**
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

### 9. Error Recovery System

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
```

### 10. Security Considerations

1. **Profile Encryption**: Roll numbers stored in SecureStore (Keychain/Keystore). No cloud sync.
2. **API Communication**: Direct HTTPS to college portal (native). Local proxy for web (CORS bypass). No third-party servers.
3. **Input Validation**: All user inputs sanitized to prevent injection attacks.
4. **Rate Limiting**: Protects both the user and the college portal from abuse.

---

## Future Enhancement Opportunities

- **Notifications**: Push notifications for low attendance and daily reminders.
- **Analytics**: Subject-wise insights and prediction algorithms.
- **Multi-Profile**: Seamlessly support and switch between multiple students.
- **Offline Mode**: Full offline functionality with background sync.
- **Export Features**: Export reports to PDF or CSV.

---

**Last Updated**: March 7, 2026  
**License**: MIT  
**Maintainer**: Atul Sahu ([@AtulSahu778](https://github.com/AtulSahu778))
