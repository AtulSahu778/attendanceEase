# AttendEase — UI Design Guide

## Design Philosophy
Dark, minimal, data-first. Every screen has one job. No clutter.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#0F172A` | All screen backgrounds |
| Surface | `#1E293B` | Cards, inputs, pickers |
| Border | `#334155` | Card borders, dividers |
| Brand | `#2563EB` | Primary buttons, active tabs, accent |
| Text Primary | `#FFFFFF` | Headings, values |
| Text Secondary | `#94A3B8` | Labels, subtitles |
| Text Muted | `#64748B` | Hints, timestamps |
| Success | `#10B981` | ≥ 75% attendance |
| Warning | `#F59E0B` | 65–74% attendance |
| Danger | `#EF4444` | < 65% attendance |

---

## Typography

All text uses the system font (React Native default). No external fonts to avoid load failures.

| Role | Size | Weight | Color |
|------|------|--------|-------|
| Screen title | 18px | Bold | White |
| Hero heading | 24–28px | Bold | White |
| Card heading | 16–17px | SemiBold | White |
| Body | 15px | Regular | `#CBD5E1` |
| Label | 13px | SemiBold | `#94A3B8` |
| Caption | 11–12px | Regular | `#64748B` |

---

## Screen Breakdown

### 1. Setup Screen (`/setup`)
**Goal:** One-time onboarding.

```
┌──────────────────────────────┐
│   [🏫 Icon]                  │
│   AttendEase                 │  ← 28px bold
│   "Set up to check with      │
│    a single tap"             │  ← 15px muted
│                              │
│  ┌──────────────────────┐    │
│  │ 🪪  Roll Number       │    │  ← TextInput, caps
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 📅  Semester IV   ▼  │    │  ← Dropdown picker
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 👤  Display Name     │    │  ← Optional
│  └──────────────────────┘    │
│                              │
│  [   Get Started     ]       │  ← Brand blue CTA
│  🔒 Stored securely...       │
└──────────────────────────────┘
```

**Key choices:**
- Roll number auto-uppercased
- Semester picker expands inline (no modal)
- Privacy note below CTA for trust

---

### 2. Home Screen (`/home`)
**Goal:** Single-tap attendance check.

```
┌──────────────────────────────┐
│  Welcome back,               │
│  Hello, Atul 👋         [⚙]  │  ← Settings icon
│                              │
│  ┌─── Blue Card ───────────┐ │
│  │ 👤 Atul Sahu     [Sem IV]│ │
│  │ 24VBIT057091            │ │
│  │ 📅 Friday, 6 March 2026 │ │
│  └─────────────────────────┘ │
│                              │
│  Attendance View             │
│  ┌──────┬──────┬──────────┐  │
│  │Overall│Daily │ Monthly  │  │  ← Tab selector
│  └──────┴──────┴──────────┘  │
│                              │
│  ┌─── Last Result ─────────┐ │
│  │  84.2%   Overall  ✅    │ │  ← Cached result card
│  │  5 subjects • 3m ago    │ │
│  └─────────────────────────┘ │
│                              │
│  [🔍  Check Attendance  ]    │  ← Primary CTA
│  Last checked: 3m ago        │
└──────────────────────────────┘
```

**Key choices:**
- Blue student card reinforces brand
- View mode tabs persist selection
- Big CTA is always visible at bottom

---

### 3. Result Screen (`/result`)
**Goal:** Show subject-wise attendance clearly.

```
┌──────────────────────────────┐
│  [←]    Attendance    [🔄]   │
│  ────────────────────────── │
│  ┌─── Tabs ───────────────┐  │
│  │ Overall │ Daily │Monthly│  │
│  └────────────────────────┘  │
│                              │
│  ┌─── Student Card ───────┐  │
│  │ 👤 ATUL SAHU           │  │
│  │ Roll: 801 • Sem IV     │  │
│  │ B.Sc.(Hons.) Info. Tech│  │
│  └────────────────────────┘  │
│                              │
│  ┌─ 84.2% ─ Overall ──────┐  │
│  │ 5 subjects • 43/51     │  │
│  └────────────────────────┘  │
│                              │
│  Subject-wise Breakdown      │
│  ┌────────────────────────┐  │
│  │ DBMS              90% 🟢│  │
│  │ ████████████░░  9/10   │  │  ← Animated bar
│  ├────────────────────────┤  │
│  │ Visual Basic .NET 66% 🟡│  │
│  │ ████████░░░░░░  4/6    │  │
│  └────────────────────────┘  │
│                              │
│  [ Open in Browser ]         │
└──────────────────────────────┘
```

**Key choices:**
- Color-coded by threshold: green ≥75, amber 65–74, red <65
- Animated progress bars (800ms ease-in)
- Each card shows Total / Present / Absent dots
- Cached data shown with amber banner
- Error states include inline retry

---

### 4. Settings Screen (`/settings`)
**Goal:** Edit profile, clear data, access portal.

```
┌──────────────────────────────┐
│  [←]      Settings           │
│                              │
│  PROFILE                     │
│  ┌──────────────────────┐    │
│  │ 🪪  Roll Number       │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 📅  Semester IV    ▼ │    │
│  └──────────────────────┘    │
│  ┌──────────────────────┐    │
│  │ 👤  Display Name     │    │
│  └──────────────────────┘    │
│  [💾  Save Changes      ]    │  ← Turns green on save
│                              │
│  DATA                        │
│  ┌──────────────────────────┐│
│  │ 🗑  Clear Cached Data    ││  ← Confirm alert
│  └──────────────────────────┘│
│                              │
│  ABOUT                       │
│  ┌──────────────────────────┐│
│  │ 🌐  College Portal  [↗] ││
│  └──────────────────────────┘│
│  ┌─ 🛡 Privacy ────────────┐ │
│  │ Data stored encrypted.  │ │
│  │ No third-party servers. │ │
│  └─────────────────────────┘ │
└──────────────────────────────┘
```

---

## Component Patterns

### Cards
```
backgroundColor: #1E293B
borderRadius: 12
borderWidth: 1
borderColor: #334155
padding: 16
```

### Primary Button
```
backgroundColor: #2563EB
borderRadius: 12–16
paddingVertical: 16–20
Text: white, 16–18px bold
```

### Input Fields
```
backgroundColor: #1E293B
borderRadius: 12
borderColor: #334155
paddingVertical: 16
Icon on left + TextInput
```

### Tab Selector
```
Container: #1E293B + border + borderRadius 12 + padding 4
Active tab: #2563EB, borderRadius 8
Inactive: transparent, text #94A3B8
```

### Percentage Color Logic
```
>= 75%  →  #10B981 (green)   background: rgba(16,185,129, 0.12)
65–74%  →  #F59E0B (amber)   background: rgba(245,158,11, 0.12)
< 65%   →  #EF4444 (red)     background: rgba(239,68,68,  0.12)
```

---

## Navigation Flow
```
        ┌─────────┐
        │  index  │  (redirector)
        └────┬────┘
     ┌────────┴────────┐
     ▼                 ▼
  /setup           /home ──────► /result
  (no profile)     (has profile)    │
                     ▲              │
                     └── /settings ─┘
```

All transitions use `slide_from_right` animation.

---

## State Colors Summary

| State | Visual |
|-------|--------|
| Loading | Icon spin, button text "Fetching..." |
| Cached data | Amber top banner with "Retry" |
| Error | Red inline box with message + Retry |
| Success save | Button turns `#059669` green briefly |
