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
- **Premium UI/UX**: Sleek, iOS-inspired dark mode interface with glassmorphism components and fluid animations.
- **Smart Caching**: AsyncStorage caches your attendance per view mode for instant loads and offline resilience.
- **Advanced Rate Limiting**: Three-layer protection (daily limit, burst detection, deduplication) with anti-scraping safeguards.
- **Auto Name Fetch**: On setup, your name is automatically fetched from the college API when you enter your roll number.
- **OTA Updates**: Over-the-air update support via `expo-updates` — bug fixes delivered without reinstalling the app.
- **Privacy Controls**: Full data deletion, request transparency stats, and a dedicated Privacy Notice screen.
- **Error Recovery**: Graceful degradation to cached data with visible warnings when the network fails.
- **Cooldown Timer**: Visible countdown prevents rate-limit abuse while informing the user.

---

## Tech Stack

- **Framework**: React Native (0.76.9) with Expo (~52.0.0)
- **Routing**: Expo Router (~4.0.0)
- **State Management**: Zustand (^4.5.0)
- **Storage**: AsyncStorage (profiles, cache, rate-limiter state)
- **Styling**: NativeWind (^4.0.1) & Tailwind CSS
- **OTA Updates**: expo-updates
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
├── _layout.tsx        # Root layout with navigation + OTA update check
├── index.tsx          # Entry redirect logic
├── setup.tsx          # Onboarding screen (with auto name fetch)
├── home.tsx           # Main dashboard
├── result.tsx         # Attendance results display
├── settings.tsx       # Profile & app settings
└── privacy.tsx        # Privacy notice screen

services/              # Business logic layer
├── attendanceApi.ts   # API client for college portal + fetchStudentName()
├── rateLimiter.ts     # Multi-layer throttling, anti-scraping & transparency
├── storage.ts         # Persistent data management (AsyncStorage)
└── updateService.ts   # OTA update checks (auto + manual)

store/                 # State management
└── useAppStore.ts     # Zustand store with all app state

types/                 # TypeScript definitions
└── index.ts           # Shared types & interfaces

components/            # Reusable UI components
└── Donation.tsx       # Donation banner/modal
```

### 1. Application Initialization Flow

```
App Launch
    ↓
_layout.tsx loads
    ↓
useAppStore.loadProfile() called
    ↓
Profile loaded from AsyncStorage
    ↓
SplashScreen hidden + OTA update check (background)
    ↓
Navigation guard checks isOnboarded
    ↓
Route to /setup OR /home
```

### 2. Onboarding Flow (Setup Screen)

```
User opens app (first time)
    ↓
Redirected to /setup
    ↓
User enters Roll Number
    ↓
[On blur] fetchStudentName() called → auto-fills Display Name from API
    ↓
User selects Semester + confirms display name
    ↓
Validation: roll number not empty, valid format (alphanumeric)
    ↓
Profile saved to AsyncStorage
    ↓
isOnboarded = true → Navigate to /home
```

**Validation Rules:**
- Roll number: Alphanumeric, max 20 chars, uppercase
- Semester: Must match predefined options (I–VIII)
- Display name: Auto-fetched from API; editable, optional

### 3. Attendance Fetching Workflow

```
User clicks "Check Attendance"
    ↓
useAppStore.fetchAttendance(forceRefresh=true)
    ↓
Rapid-click guard: if 5+ taps in 15s → apply 30s cooldown
    ↓
Rate limiter checks (burst limit, daily limit, anti-scraping)
    ↓
Request deduplication check
    ↓
API call based on viewMode:
  - overall  → fetchOverallAttendance()
  - daily    → fetchDailyAttendance()
  - monthly  → fetchMonthlyAttendance()
    ↓
Response validation & parsing
    ↓
Cache result to AsyncStorage
    ↓
Navigate to /result

[If error occurs]
    ↓
Try loading cached data
    ↓
Display cached data with warning banner  OR  Display error with retry option
```

### 4. API Communication Layer

**Endpoint Structure:**
```
BASE_URL (Platform-dependent):
  - Web:    http://localhost:3001/api/Student  (via CORS proxy)
  - Native: https://sxcran.ac.in/Student      (direct HTTPS)

Endpoints:
  - POST /showOverallAttendance
  - POST /showDailyAttendance
  - POST /showMonthlyAttendance
```

**Error Handling:**
| Error Type | Recovery |
|---|---|
| Network error | Retry, fall back to cache |
| Timeout (8s) | Retry, fall back to cache |
| Empty result | User-friendly message |
| Rate limit | Show cooldown timer |
| Abuse detected | Block further requests |

### 5. Rate Limiting System

**Three-Layer Protection:**

1. **Burst Limit**: 8 requests per 60-second sliding window.
2. **Daily Limit**: Max 50 requests per day (persisted in AsyncStorage, resets at midnight).
3. **In-Flight Deduplication**: Returns the same Promise for concurrent identical requests.
4. **Anti-Scraping**: Blocks access if more than 10 unique roll numbers are queried in a day.
5. **UI Cooldown**: After 5 rapid manual taps (within 15s), a 30-second visible cooldown is applied on the home screen CTA.

**Transparency Stats (visible in Settings):**
- API Requests Today: `X / 50`
- Last Data Fetch: `Xm ago`
- Local Cache Age: `Xm ago`

### 6. Caching Strategy

| Data | Storage | TTL |
|---|---|---|
| Student Profile | AsyncStorage (`student_profile`) | Persistent |
| Overall attendance | AsyncStorage | 5 min |
| Monthly attendance | AsyncStorage | 5 min |
| Daily attendance | AsyncStorage | 10 min |

### 7. Privacy & Data Management

- **No External Servers**: All data is fetched directly from the college portal. Nothing is stored or routed through third-party servers.
- **Delete My Data**: Wipes all AsyncStorage data (profile + cache + rate-limiter counters) in a single call. On web, also clears `localStorage`.
- **Privacy Notice**: Accessible from Settings → Privacy Notice (`/privacy` screen).
- **Roll Number Lock**: Roll number is locked after setup and requires a confirmation dialog to edit.

### 8. OTA Update System

- **Auto-check on launch**: `checkForUpdates()` runs silently in `_layout.tsx` on every app start. If an update is available, it is downloaded and the user is prompted to reload.
- **Manual check**: Settings → Check for Updates triggers `checkForUpdatesManual()` with user-facing alerts.
- **Dev guards**: Both functions are no-ops in development / Expo Go (`__DEV__` guard). Real OTA requires a production/EAS build.

```bash
# Build for EAS Update
npx eas build
npx expo update   # publish a JS update
```

### 9. State Management (Zustand)

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
  cooldownEnd: number;     // timestamp for visible countdown
  fetchAttempts: number;   // rapid-tap counter

  // Actions
  loadProfile()
  setProfile()
  setViewMode()
  setSelectedDate()
  fetchAttendance(forceRefresh?)
  clearError()
  deleteAllData()
}
```

### 10. Security Considerations

1. **Profile Storage**: Roll number and semester stored in AsyncStorage (not SecureStore, which had unreliable deletion on some devices).
2. **API Communication**: Direct HTTPS to college portal (native). Local proxy for web (CORS bypass). No third-party servers.
3. **Input Validation**: All user inputs sanitized and validated before use.
4. **Rate Limiting + Anti-Scraping**: Protects the college portal from automated abuse.
5. **Data Deletion**: Single `AsyncStorage.clear()` call atomically removes all app data.

---

## Future Enhancements

- **Notifications**: Push notifications for low attendance and daily reminders.
- **Analytics**: Subject-wise insights and prediction algorithms.
- **Multi-Profile**: Support and switch between multiple students.
- **Export Features**: Export attendance reports to PDF or CSV.

---

**Last Updated**: March 9, 2026  
**License**: MIT  
**Maintainer**: Atul Sahu ([@AtulSahu778](https://github.com/AtulSahu778))
