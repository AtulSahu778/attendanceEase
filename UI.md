# AttendEase — UI Design Guide (iOS 17 Aesthetic)

## Design Philosophy
Pure black, immersive glass, and micro-interactions. The app strictly adheres to a premium iOS 17 aesthetic: no solid card colors, tightened system typography, and completely fluid press-scale animations.

---

## 🎨 Token System

### Backgrounds & Glass
| Token | Value | Usage |
|-------|-------|-------|
| Canvas | `#000000` | Absolute black for OLED screens everywhere |
| Glass Card Core | `BlurView` `intensity: 40`, `tint: "dark"` | Foundation for all cards, inputs, and active UI |
| Glass Picker/Menu | `BlurView` `intensity: 50`, `tint: "dark"` | Deeper blur for elevated dropdown menus |
| Glass Shimmer | `rgba(255,255,255, 0.20)` | 1px top stroke on cards simulating light bleed |
| Glass Outline | `rgba(255,255,255, 0.18)` | Standard card/input 1px border |

### Semantic Status Colors
State colors are paired with highly transparent, saturated ambient glows using `shadowColor` on glass cards.

| State | Solid Color | Glow (Shadow/Badge) | Background Usage |
|-------|-------------|---------------------|------------------|
| **Present/Success** | `rgb(52, 199, 89)` | `rgba(52,199,89, 0.25)` | ≥ 75% thresholds |
| **Late/Warning** | `rgb(255, 159, 10)` | `rgba(255,159,10, 0.20)` | 65–74% thresholds |
| **Absent/Danger** | `rgb(255, 59, 48)` | `rgba(255,59,48, 0.20)` | < 65% thresholds |

### Typography Tokens
*All text uses default system fonts (`San Francisco` on iOS, `Roboto` on Android) to guarantee instant mounting without asset loading.*

| Role | Properties | Color |
|------|------------|-------|
| Hero Title | `24-28px`, `Bold 700`, `ls: -0.8` | `#FFFFFF` |
| Screen Title| `18px`, `Bold 700`, `ls: -0.5` | `#FFFFFF` |
| CTA Button | `16-17px`, `Bold 700`, `ls: -0.3` | `#000000` (on white bg) |
| Card Title | `16-17px`, `SemiBold 600`, `ls: -0.4` | `#FFFFFF` |
| Standard Body| `15px`, `Regular 400`, `ls: -0.2` | `rgba(255,255,255, 0.75)` |
| Picker/Label | `13-15px`, `Medium 500`, `ls: -0.2` | `rgba(255,255,255, 0.55)` |
| Muted Caption| `11-12px`, `Regular 400`, `ls: 0.1` | `rgba(255,255,255, 0.35)` |

*Note: `ls` = `letterSpacing`. Tight letter spacing (`-0.2` to `-0.8`) is mandatory for the iOS aesthetic.*

---

## 🎬 Animation System

All interactions and screen transitions must be fluid and physics-based. 

### 1. The "Press Scale" (Reanimated Spring)
Every tappable element (cards, buttons, icons, settings rows) must use a spring-based scale compression on touch.
* **Property:** `scale` transforms from `1` to `0.96` (or `0.985` for large cards).
* **Timing (In):** `duration: 120ms` Linear/Easing.
* **Timing (Out):** Spring physics (`damping: 15`).

### 2. Staggered Entrance (Screen Mount)
When complex screens (`home`, `result`) mount, their child rows must cascade inward rather than snapping instantly.
* **Animation:** Parallel Fade (`opacity: 0 -> 1`) + Slide (`translateY: 16 -> 0`).
* **Duration:** `480ms` with Native Driver.
* **Stagger:** Delay incrementing by `50ms` per row.

### 3. Progress Bars (`result.tsx`)
* **Animation:** Width extrapolates from `0%` to `percentage`.
* **Timing:** `800ms` duration, `300ms` base delay + `50ms` stagger per card.
* **Aesthetic:** Saturated color fill with a high-opacity `.shadowColor` glow of the same color.

---

## 🧱 Key Component Recipes

### The Glass Card Base
This is the universally standard container for content blocks (Stats, Subjects, Settings, Profiles).
```tsx
<BlurView intensity={40} tint="dark" style={s.glassCard}>
  <View style={s.shimmerLine} /> {/* 1px rgba(255,255,255,0.2) positioned absolute top-0 */}
  {/* Content */}
</BlurView>

// StyleSheet
glassCard: {
  backgroundColor: 'rgba(255,255,255,0.10)',
  borderRadius: 20, 
  borderWidth: 1, 
  borderColor: 'rgba(255,255,255,0.18)',
  overflow: 'hidden', 
  padding: 16 // strict layout normalization
}
```

### The Primary CTA Button
CTAs are highly contrasted against the black background to command hierarchy.
```tsx
ctaButton: { 
  backgroundColor: 'rgba(255,255,255,0.95)', // Nearly pure white
  borderRadius: 16, 
  paddingVertical: 18, 
  alignItems: 'center', 
  flexDirection: 'row', 
  justifyContent: 'center', 
  gap: 10, 
  shadowColor: '#fff', 
  shadowOpacity: 0.10, 
  shadowRadius: 20, 
  shadowOffset: { width: 0, height: 4 }, 
  elevation: 8 
}
```

---

## 📱 Screen Breakdown Highlights

1. **Setup (`/setup`)**: Single glass block for forms. Optional inputs clearly marked. Press-scale on the semester toggle revealing a nested inline glass picker.
2. **Home (`/home`)**: Staggered mount. Glass semantic tabs (Overall, Daily, Monthly). Heavy use of `timeAgo` timestamps with muted captions inside a rapid-fetch visual block.
3. **Result (`/result`)**: The most complex layout. A central hero percentage card projecting an intense semantic drop shadow. Staggered progress bars.
4. **Settings (`/settings`)**: Profile inline edits. Glass `BlurView` inputs. Dedicated "Developer" section with GitHub/Instagram. "About/Privacy" section standardizing the "educational-only" legal disclaimer. Save button triggers an inline state change to Green `rgb(52,199,89)` on success.

## 📏 Layout Standards
All screens strictly abide by a global horizontal rhythm. 
* Side Padding/Margins: **24px** strict.
* Vertical rhythm in forms: **14-16px** padding inside containers.
* Component visual centering: Enforced via `flexDirection: 'row', alignItems: 'center'`. No floating text.
