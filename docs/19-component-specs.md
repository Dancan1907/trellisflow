# 19 — Component Specs

> The visual reference for every component in TrellisFlow. Every screen must use these components. If a new component is needed, it must be specified in this document first.

## 1. App Layout Shell

The app shell is the frame that wraps every authenticated screen.

### Structure

```
┌─────────────────────────────────────────────────────────┐
│  Top Bar (56px height)                                  │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │   Main Content                               │
│ (240px)  │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### Top Bar

- **Height:** 56px.
- **Background:** `--bg-secondary`. **Border-bottom:** 1px `--border-subtle`.
- **Left:** Container switcher dropdown (icon + name of active container + chevron).
- **Center:** Global search input (240px wide, ghost style).
- **Right:** Insights bell (with badge if count > 0), profile menu (avatar + dropdown).
- **Behavior:** Sticky to top of viewport.

### Sidebar (Desktop)

- **Width:** 240px. **Background:** `--bg-secondary`. **Border-right:** 1px `--border-subtle`.
- **Sections:**
  - Logo + "TrellisFlow" wordmark (top, 64px tall)
  - **Overview:** Dashboard
  - **Money:** Personal, Investments, Businesses
  - **Plan:** Budgets, Goals, Debt
  - **Analyze:** Reports, Insights
  - **Settings** (bottom)
- **Item style:** 40px height, radius 6px, 16px icon + 14px label, 12px horizontal padding.
- **Active state:** `--accent-primary-subtle` background, `--accent-primary` icon, `--fg-primary` text.
- **Hover state:** `--bg-tertiary` background.

### Sidebar (Mobile)

- Becomes a bottom nav bar (60px height) with 5 icons: Dashboard, Personal, Investments, Businesses, More.

## 2. Hero Net Worth Card

The centerpiece of the dashboard. The user's entire financial life in one number.

### Layout

```
┌─────────────────────────────────────────────┐
│  Total Net Worth                [Container ▾]│
│                                             │
│  KES 154,300.00                             │
│  ↑ +8.4% this month        [Snapshot date]  │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Personal    Investments   Businesses       │
│  KES 14,500  KES 26,800    KES 113,000      │
└─────────────────────────────────────────────┘
```

### Style

- **Card:** full-width (max 1200px), `--bg-secondary`, radius 8px, padding 32px.
- **Total number:** `--text-mono` at 48px, weight 600, `--fg-primary`.
- **Delta:** `--text-sm`, green if positive, red if negative, with ↑/↓ icon.
- **Breakdown:** grid of 3 columns, each with a small label (`--text-xs`, `--fg-secondary`) and value (`--text-mono`, `--fg-primary`).

## 3. Container Cards (Dashboard Widgets)

Each container (Personal, Investments, Business) gets a card.

### Layout

```
┌─────────────────────────────────────┐
│  🏠  Personal                       │
│                                     │
│  KES 14,500.00                      │
│  ↑ +2.1% this month                 │
│                                     │
│  3 accounts                         │
│                                     │
│  → View details                     │
└─────────────────────────────────────┘
```

### Style

- **Size:** min-height 180px, radius 8px, `--bg-secondary`.
- **Icon:** 24px Lucide icon, colored `--accent-primary`.
- **Value:** `--text-mono` at 28px, weight 600.
- **Hover:** border becomes `--border-strong`, card background becomes `--bg-tertiary`.

## 4. Transaction Row

For lists of transactions (Personal, Business, container detail).

### Layout

```
[Date]  [Description]           [Category]     [Account]     [Amount]
Oct 22  Bought groceries       Food           M-Pesa        −1,500.50 KES
```

### Style

- **Height:** 48px.
- **Date:** `--text-xs`, `--fg-tertiary`, monospace, leftmost.
- **Description:** `--text-sm`, `--fg-primary`, weight 500.
- **Category:** badge style, neutral.
- **Account:** `--text-xs`, `--fg-secondary`.
- **Amount:** `--text-mono`, right-aligned. Negative (expense) shows `−` sign; income shows `+` sign, but color is neutral unless highlighting a specific status.
- **Hover:** row background `--bg-tertiary`.

## 5. Budget Progress Card

### Layout

```
┌─────────────────────────────────────────────┐
│  Food                              [Edit ⚙] │
│  KES 15,000.00 monthly budget               │
│                                             │
│  KES 4,500 spent · 30%                      │
│  [████░░░░░░░░░░░░░░░░░░░░░░░░░░]           │
│                                             │
│  Remaining: KES 10,500.00                   │
└─────────────────────────────────────────────┘
```

### Style

- **Progress bar:** 8px height, radius full.
- **Fill color:**
  - `0–79%` → `--positive`
  - `80–99%` → `--warning`
  - `≥ 100%` → `--negative`
- **Percent:** `--text-mono`, weight 600, aligned with the bar.

## 6. Form Controls

### Text Input

- **Height:** 40px. **Radius:** 6px. **Border:** 1px `--border-subtle`. **Background:** `--bg-primary`.
- **Padding:** 0 12px.
- **Focus:** border `--accent-primary`, 2px focus ring.
- **Placeholder:** `--fg-tertiary`.

### Number / Amount Input

Same as text input, but with `--text-mono` font and a currency suffix (e.g., `KES`) rendered on the right inside the input.

### Select / Dropdown

- **Height:** 40px. **Radius:** 6px. **Border:** 1px `--border-subtle`.
- **Chevron** on right (Lucide `ChevronDown`, 16px).
- **Menu:** `--bg-secondary`, radius 6px, shadow-md, `--border-subtle`, max-height 320px with scroll.

### Date Picker

- Text input + calendar icon (Lucide `Calendar`).
- Clicking opens a calendar popover.

## 7. Buttons

See `docs/18-design-system.md` §9 for full spec. Summary:

- **Primary:** Blue, white text.
- **Secondary:** Transparent, slate border.
- **Ghost:** Transparent, no border, hover shows `--bg-tertiary`.
- **Destructive:** Red, white text.
- **All:** Height 40px, radius 6px, padding 0 16px, font `--text-sm`, weight 500.

## 8. Modal

### Layout

- **Overlay:** `rgba(0, 0, 0, 0.6)` with backdrop blur (8px).
- **Modal:** centered, max-width 480px, `--bg-secondary`, radius 8px, shadow-lg.
- **Header:** 24px padding, title in `--text-h2`, close button top-right (Lucide `X`).
- **Body:** 24px padding.
- **Footer:** 24px padding, right-aligned action buttons.

## 9. Toast (Transient Feedback)

- **Position:** bottom-right, stacked vertically (max 3 visible).
- **Style:** `--bg-secondary`, radius 8px, border-left 4px colored by variant, shadow-md.
- **Variants:** success (green left border), error (red), warning (amber), info (blue).
- **Auto-dismiss:** 5 seconds. Manual close via `X` icon.

## 10. Empty States

Every list/table/dashboard zone has an empty state.

### Layout

```
       [large icon 48px]

       No transactions yet

   Add your first transaction to start tracking.

         [+ Add Transaction]
```

### Style

- **Icon:** 48px Lucide, color `--fg-tertiary`.
- **Title:** `--text-h3`, `--fg-primary`.
- **Description:** `--text-body`, `--fg-secondary`, max-width 400px, centered.
- **Action:** primary button below.

## 11. Loading States

- **Skeletons:** rectangular blocks with `--bg-tertiary` background, subtle shimmer animation (1.5s loop).
- **Tables:** 5 skeleton rows per loading table.
- **Cards:** one large skeleton block per loading card.
- **No spinners unless blocking.** Prefer skeletons over spinners.

## 12. Error States

- **Inline errors:** below the field, `--text-xs`, `--negative`, with `AlertCircle` icon.
- **Page-level errors:** centered card, `AlertCircle` 48px in `--negative`, error title, retry button.
- **Toasts:** for transient errors (network, validation).

## 13. Insights Card

### Layout

```
┌─────────────────────────────────────────────┐
│  ⚠ Budget Exceeded                          │
│                                             │
│  You have exceeded your budget of KES 15,000│
│  by KES 3,500.50.                           │
│                                             │
│  [View budget]                    [Dismiss] │
└─────────────────────────────────────────────┘
```

### Style

- **Icon:** 20px Lucide, colored by severity (`--warning` for warnings, `--accent-primary` for opportunities, `--negative` for critical).
- **Title:** `--text-h3`, weight 600.
- **Message:** `--text-sm`, `--fg-secondary`.
- **Actions:** ghost buttons.

## 14. Currency & Number Display

- **Format:** `KES 1,250.00` — currency code, thousands separator, 2 decimals.
- **Negative:** `−KES 1,250.00` — sign before currency.
- **Zero:** `KES 0.00`.
- **Font:** always `JetBrains Mono`.
- **Alignment:** right in tables, left inline in body.

## 15. Design Token Implementation

All tokens are defined once in `app/globals.css` as CSS variables, and mirrored in `tailwind.config.ts` for utility class access:

```css
:root {
  /* Backgrounds */
  --bg-primary: #0b1220;
  --bg-secondary: #111a2e;
  --bg-tertiary: #1a2540;

  /* Borders */
  --border-subtle: #1e293b;
  --border-strong: #334155;

  /* Foregrounds */
  --fg-primary: #f1f5f9;
  --fg-secondary: #94a3b8;
  --fg-tertiary: #64748b;

  /* Accents */
  --accent-primary: #2563eb;
  --accent-primary-hover: #3b82f6;
  --accent-primary-subtle: #1e3a8a;

  /* Status */
  --positive: #10b981;
  --negative: #ef4444;
  --warning: #f59e0b;
  --info: #38bdf8;
}
```

Tailwind config extends the default theme with these tokens, so classes like `bg-bg-secondary` or `text-fg-primary` are available.

## 16. What This Document Doesn't Cover (Yet)

- **Light mode tokens** — defined in Wave 2.
- **Charts** — line, bar, pie specs — defined in `docs/20-chart-specs.md` when we build Reports screens.
- **Marketing landing page** — uses these tokens but with its own layout spec, defined in `docs/21-landing-page.md` when we build it.

## 17. Design Rules Summary

1. **Every component references this document.** No exceptions.
2. **New components require a spec update.** Design before code.
3. **Tokens are law.** Never use raw hex values in components.
4. **Status colors are earned.** Green means good. Red means bad. Blue means "click me."
5. **Numbers are sacred.** Monospace, right-aligned, always 2 decimals.
6. **Density is a feature.** 48px rows, 24px card padding, no empty space without purpose.
7. **Accessibility is not optional.** Contrast, keyboard, focus, aria-labels always.
8. **If a design decision isn't documented, it doesn't ship.**
