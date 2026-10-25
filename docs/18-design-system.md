# 18 — Design System

> The visual and interaction language of TrellisFlow. Every component we build must reference this document. If a design decision is not in this document, it does not exist yet.

## 1. Design Philosophy

TrellisFlow is a **financial command center for people with complex money lives** — employees, investors, and business owners. The design must communicate:

- **Trust** — This is where serious money lives. Nothing should look cheap, playful, or unreliable.
- **Clarity** — Users stare at numbers for hours. Every visual choice reduces cognitive load.
- **Growth** — The "Trellis" name is about supporting growth. Green carries meaning, not decoration.
- **Restraint** — Density over decoration. Precision over flashiness. Every pixel earns its place.

**Anti-goals:** Not a generic admin template. Not a consumer banking app. Not a marketing-first product with a dashboard bolted on. A serious tool that also happens to be beautiful.

## 2. Color System

### Semantic Color Tokens (Dark-First)

Every color has a **purpose**, not just a hex value. Components reference semantic tokens, never raw colors.

| Token                     | Hex       | Purpose                                              |
| ------------------------- | --------- | ---------------------------------------------------- |
| `--bg-primary`            | `#0B1220` | App canvas (darkest surface)                         |
| `--bg-secondary`          | `#111A2E` | Elevated surfaces, cards                             |
| `--bg-tertiary`           | `#1A2540` | Hover states, secondary surfaces                     |
| `--bg-inverse`            | `#F8FAFC` | Inverse surfaces (light mode previews)               |
| `--border-subtle`         | `#1E293B` | Default dividers, card borders                       |
| `--border-strong`         | `#334155` | Focused inputs, emphasized borders                   |
| `--fg-primary`            | `#F1F5F9` | Body text, primary labels                            |
| `--fg-secondary`          | `#94A3B8` | Secondary labels, muted text                         |
| `--fg-tertiary`           | `#64748B` | Timestamps, help text, hints                         |
| `--fg-inverse`            | `#0B1220` | Text on inverse surfaces                             |
| `--accent-primary`        | `#2563EB` | Primary buttons, active tabs, links                  |
| `--accent-primary-hover`  | `#3B82F6` | Hover state for primary actions                      |
| `--accent-primary-subtle` | `#1E3A8A` | Active tab background, selected nav                  |
| `--positive`              | `#10B981` | Positive net worth deltas, achieved goals, surpluses |
| `--positive-subtle`       | `#064E3B` | Background for positive badges                       |
| `--negative`              | `#EF4444` | Losses, overspent budgets, failures                  |
| `--negative-subtle`       | `#7F1D1D` | Background for negative badges                       |
| `--warning`               | `#F59E0B` | Near budget limit, stale data, attention             |
| `--warning-subtle`        | `#78350F` | Background for warning badges                        |
| `--info`                  | `#38BDF8` | Informational messages, help                         |

### Usage Rules

1. **Blue** is for **interaction**: buttons, links, active tabs, focus rings, selected nav.
2. **Green** is for **positive status**: net worth gained, budget under limit, goal achieved, transaction posted successfully.
3. **Red** is for **negative status**: net worth lost, budget overspent, transaction failed, error.
4. **Amber** is for **attention**: near budget limit, stale external summary, token about to expire.
5. **Never use green for a button.** Never use red for anything non-critical. Never use blue for a status.

### Light Mode (Wave 2 — Pre-defined)

Tokens for light mode will be defined in Wave 2. The naming is identical. Only hex values change:

| Token                        | Dark      | Light     |
| ---------------------------- | --------- | --------- |
| `--bg-primary`               | `#0B1220` | `#F8FAFC` |
| `--bg-secondary`             | `#111A2E` | `#FFFFFF` |
| `--fg-primary`               | `#F1F5F9` | `#0F172A` |
| `--fg-secondary`             | `#94A3B8` | `#475569` |
| _(others defined in Wave 2)_ |           |           |

## 3. Typography

### Font Families

- **UI / body:** `Inter` (weights 400, 500, 600, 700)
- **Numerics:** `JetBrains Mono` (weights 400, 500, 600)
- **Serif (landing page only):** `Fraunces` (optional, for hero headlines on marketing pages only — never in the app)

Loaded via `next/font`. Preloaded, subset, no external CDN dependency.

### Type Scale

| Token            | Size | Line Height | Weight | Use                             |
| ---------------- | ---- | ----------- | ------ | ------------------------------- |
| `--text-display` | 48px | 1.1         | 700    | Landing page hero only          |
| `--text-h1`      | 32px | 1.2         | 600    | Page titles, dashboard headline |
| `--text-h2`      | 24px | 1.3         | 600    | Section headers, modal titles   |
| `--text-h3`      | 20px | 1.4         | 600    | Card titles, subsection headers |
| `--text-body`    | 16px | 1.5         | 400    | Default body text               |
| `--text-sm`      | 14px | 1.5         | 400    | Secondary text, table cells     |
| `--text-xs`      | 12px | 1.5         | 500    | Labels, badges, timestamps      |
| `--text-mono`    | 14px | 1.5         | 500    | Numbers in tables, metrics      |

### Numeric Formatting (Sacred)

**All money values use `JetBrains Mono`** and follow this format:

- **Currency symbol first:** `KES 1,250.00` (not `1,250.00 KES`)
- **Thousands separator:** comma
- **Decimal places:** 2 (always)
- **Negative values:** minus sign + red color when in a status context, minus sign + neutral color in a plain list
- **Positive deltas:** plus sign + green (only when contextually positive, e.g., income, gains)
- **Alignment:** right-aligned in tables, never centered

## 4. Spacing Scale

Following Tailwind defaults. Use these tokens, never arbitrary spacing.

| Token        | Value | Use                                   |
| ------------ | ----- | ------------------------------------- |
| `--space-1`  | 4px   | Icon gaps, tight inline spacing       |
| `--space-2`  | 8px   | Inside buttons, badges                |
| `--space-3`  | 12px  | Between related elements              |
| `--space-4`  | 16px  | Card padding (small), form field gaps |
| `--space-6`  | 24px  | Card padding (large), section spacing |
| `--space-8`  | 32px  | Section headers to content            |
| `--space-12` | 48px  | Major section breaks                  |
| `--space-16` | 64px  | Page-level spacing (landing page)     |

**Density rule for the app:** The app is _dense_. Table row height is 48px, card padding is 24px, section gaps are 24–32px. The landing page is _airy_: 64px+ gaps, larger headings.

## 5. Border Radius

| Token           | Value  | Use                           |
| --------------- | ------ | ----------------------------- |
| `--radius-sm`   | 4px    | Badges, tags, small buttons   |
| `--radius-md`   | 6px    | Inputs, buttons, cards        |
| `--radius-lg`   | 8px    | Modals, large containers      |
| `--radius-full` | 9999px | Pills (avatars, filter chips) |

**Rule:** Never use radius above 8px on the app (except for pills/avatars). Never use sharp corners (radius 0). The middle path is 6–8px.

## 6. Shadows & Elevation

Dark UI relies on **borders more than shadows**. Shadows are subtle.

| Token         | Value                         | Use                       |
| ------------- | ----------------------------- | ------------------------- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)`   | Inputs, subtle cards      |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)`  | Elevated cards, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.5)` | Modals, popovers          |

## 7. Motion

Motion is **functional, not decorative**. Everything animates to communicate state changes.

| Token           | Duration | Easing      | Use                               |
| --------------- | -------- | ----------- | --------------------------------- |
| `--motion-fast` | 100ms    | ease-out    | Hover states, focus rings         |
| `--motion-base` | 200ms    | ease-in-out | Buttons, tabs, dropdowns          |
| `--motion-slow` | 300ms    | ease-in-out | Modals, drawers, page transitions |

**Rule:** Never animate something a user didn't initiate. No bouncing, no shaking, no "attention grabbers."

## 8. Iconography

**Icon family:** Lucide.

**Sizes:**

- `16px` — inline with small text, badges
- `20px` — buttons, nav items, table row actions
- `24px` — section headers, larger actions
- `32px+` — empty states, hero illustrations

**Rule:** Icon-only buttons must always have `aria-label`. Icon colors follow the same semantic tokens as text.

## 9. Component Primitives

### Buttons

- **Primary:** Blue background, white text, radius 6px, height 40px, padding 0 16px.
- **Secondary:** Transparent background, slate border (`--border-strong`), white text.
- **Ghost:** No background, no border, hover shows `--bg-tertiary`.
- **Destructive:** Red background, white text.
- **States:** hover (lighter), focus (blue ring 2px), disabled (50% opacity), loading (spinner replaces label).

### Inputs

- **Height:** 40px. **Radius:** 6px. **Border:** `--border-subtle`.
- **Focus:** border becomes `--accent-primary`, 2px focus ring.
- **Error:** border `--negative`, error text below in `--text-xs`.
- **Placeholder:** `--fg-tertiary`.

### Cards

- **Background:** `--bg-secondary`. **Border:** `--border-subtle`. **Radius:** 8px.
- **Padding:** 24px.
- **Hover (if interactive):** background shifts to `--bg-tertiary`, border becomes `--border-strong`.

### Tables

- **Header:** `--fg-secondary`, uppercase, `--text-xs`, letter-spacing wide.
- **Row height:** 48px. **Border between rows:** `--border-subtle`.
- **Hover:** row background becomes `--bg-tertiary`.
- **Numbers:** right-aligned, monospace.

### Badges

- **Positive** (`--positive-subtle` bg, `--positive` text): "In limit", "Achieved", "Paid".
- **Negative** (`--negative-subtle` bg, `--negative` text): "Over budget", "Failed", "Overdue".
- **Warning** (`--warning-subtle` bg, `--warning` text): "Near limit", "Stale".
- **Neutral** (`--bg-tertiary` bg, `--fg-secondary` text): "Draft", "Archived".

### Progress Bars

- **Height:** 8px. **Radius:** full.
- **Background:** `--bg-tertiary`.
- **Fill:**
  - `< 80%` → `--positive`
  - `80–99%` → `--warning`
  - `≥ 100%` → `--negative`
- **Label:** percentage displayed above or beside the bar in `--text-mono`.

## 10. Accessibility

- **Minimum contrast:** WCAG AA (4.5:1 for body text, 3:1 for large text).
- **Focus visible:** Every interactive element shows a 2px `--accent-primary` ring on focus.
- **No color-only meaning:** Every positive/negative indicator also shows a sign (+/−) or icon (↑/↓).
- **Keyboard:** Every action reachable via keyboard. Tab order follows visual order.
- **Screen reader:** Icon-only buttons have `aria-label`. Loading states have `aria-live`.
- **Reduced motion:** `prefers-reduced-motion` disables non-essential animations.

## 11. Design Rules Summary

1. **Blue is interaction. Green is positive. Red is negative. Amber is attention.** Never cross-purposes.
2. **Numbers are monospace, right-aligned, always 2 decimals.**
3. **Cards have borders, not heavy shadows.**
4. **Radius: 4–8px. No sharp, no round.**
5. **Density: 48px rows, 24px card padding, 24–32px section gaps.**
6. **Landing page is airier; app is denser. Same tokens.**
7. **No animation a user didn't trigger.**
8. **Every icon-only button has an aria-label.**
9. **Every semantic color must be _earned_ by the underlying data.**
10. **If a design decision isn't in this document, it doesn't exist.**
