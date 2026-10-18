# 12 — Frontend Architecture

## Overview

The frontend is a **Next.js 15 (App Router)** application. It talks to the NestJS backend via REST, using a **typed client generated from the backend's OpenAPI spec**.

## App Structure

```
apps/web/
├── src/
│   ├── app/
│   │   ├── (public)/              # No auth
│   │   ├── (onboarding)/          # First-time flow
│   │   └── (app)/                 # Authenticated shell
│   ├── components/
│   │   ├── ui/                    # shadcn/ui primitives
│   │   ├── layout/                # Sidebar, topbar, container switcher
│   │   ├── charts/                # Recharts wrappers
│   │   ├── forms/                 # Reusable form fields
│   │   ├── shared/                # Cross-feature components
│   │   └── features/              # Feature-specific components
│   ├── lib/
│   │   ├── api/                   # Generated REST client
│   │   ├── auth/                  # Auth helpers
│   │   ├── hooks/                 # Custom hooks
│   │   └── utils/                 # Utilities
│   └── styles/
```

## Rendering Strategy

- **Server Components by default** — less JS shipped, faster loads, direct data access.
- **Client Components for interactivity** — forms, modals, real-time UI.
- **Streaming with Suspense** — dashboard loads hero first, then widgets.
- **Static rendering** for public pages (landing, privacy, terms).

## Data Fetching

- **REST client generated from OpenAPI** — fully typed.
- **TanStack Query** for caching, refetching, optimistic updates.
- **Server-side fetching in Server Components** — no waterfall.
- **Client-side fetching only when necessary** — mutations, real-time updates.

## State Management

- **Server state:** TanStack Query.
- **Client state (UI):** Zustand (modals, theme, sidebar).
- **Form state:** react-hook-form.
- **URL state:** filters, view modes, container selection — all in query params.

## Auth (Web)

- Access token stored in memory.
- Refresh token in httpOnly cookie.
- Silent refresh on 401.
- Sensitive pages check verification status.

## Styling

- **Tailwind CSS** — utility-first.
- **shadcn/ui** — component library (Radix primitives, owned source).
- **Design tokens** in `tailwind.config.ts`.
- **Dark mode** via `dark:` variant and theme toggle.

## Forms

- **react-hook-form** for state.
- **Zod** for validation (schemas from `@trellisflow/shared`).
- **shadcn/ui Form** components for consistent look.
- Client-side validation mirrors server-side rules exactly.

## Charts

- **Recharts** wrapped in reusable components under `components/charts/`.
- Used for: net worth trend, cash flow, allocation, budget progress.

## Component Rules

- **`ui/`** — pure, no imports from `features/`.
- **`features/`** — can import from `ui/`, `shared/`, `forms/`, `charts/`.
- **No cross-feature imports.** If two features need the same component, promote it to `shared/`.

## Accessibility

- **Semantic HTML.**
- **Keyboard navigable.**
- **Focus indicators visible.**
- **ARIA labels on icon-only buttons.**
- **WCAG AA contrast minimum.**
- **No color-only meaning** — signs (+, −) accompany colors.

## Performance Targets

- **Dashboard < 2s** on mid-range mobile.
- **Code splitting** per route (Next.js does this automatically).
- **Image optimization** via `next/image`.
- **Font optimization** via `next/font`.
- **Pagination/infinite scroll** for all lists.

## Error & Loading States

- **Every async operation** has loading, empty, and error states.
- **Error boundaries** at route level.
- **Toasts** for transient feedback.

## What We Are Not Doing (Yet)

- **Offline mode** — deferred.
- **Real-time sync** — daily refresh suffices.
- **Internationalization** — English only for MVP.
- **Theming beyond light/dark** — not needed.
- **Animation library** — Tailwind transitions cover most needs.
