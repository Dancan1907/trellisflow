# 06 — Feature Waves

## What This Chapter Is

The build order for TrellisFlow, organized as **waves**. Each wave is a coherent, shippable increment. You can stop after any wave and have a usable product.

## Wave Overview

| Wave | Focus                              | Estimated Effort |
| ---- | ---------------------------------- | ---------------- |
| 0    | Setup & Foundations                | 3–5 days         |
| 1    | Foundation (V0.1 "First Ship")     | 3–5 weeks        |
| 2    | Investments                        | 1.5–2 weeks      |
| 3    | Internal Businesses                | 2 weeks          |
| 4    | External Businesses (Manual)       | 1.5 weeks        |
| 5    | External Businesses (API) + Polish | 3–4 weeks        |
| 6    | Future / Post-MVP                  | Variable         |

**Total for MVP (Waves 0–5):** ~3–4 months of focused solo work.

## Wave 0 — Setup & Foundations

**Goal:** A running monorepo skeleton, deployed nowhere, with no features.

**Deliverable:** Monorepo builds. `pnpm dev` starts both apps. Empty pages render. CI runs on every push.

**Contents:**

- Git repo + branch protection.
- pnpm workspace + Turborepo.
- `apps/api` (NestJS) + `apps/web` (Next.js) + `packages/shared`.
- Lint, Prettier, Husky, commitlint, lint-staged.
- Base configs (tsconfig, eslint, prettier).
- CI workflow (lint + typecheck + build).
- `.env.example` files.
- Project Bible documentation.

## Wave 1 — Foundation (V0.1 "First Ship")

**Goal:** A working budgeting + net-worth app for a single user. Personal container only. Budgets. Dashboard. Deployed.

**Persona covered:** The Employee.

**Contents:**

- Prisma schema (all 22 tables).
- Multi-tenancy Prisma extension.
- Auth module (signup, login, JWT, refresh, reset, verify).
- Containers module.
- Accounts, categories, transactions modules.
- Recurring rules + generator job.
- Budgets (simple targets).
- Savings goals.
- Snapshots + reports + PDF export.
- Basic insights (3 rules).
- Dashboard endpoints.
- Frontend: shell, auth pages, onboarding, all Personal screens, budgets, goals, reports, settings.
- Tests: unit, integration, e2e for critical paths.
- Deploy: Vercel + Render + Neon.

**Deliverable:** V0.1 live. Employee persona fully supported.

## Wave 2 — Investments

**Goal:** Add the Investor persona.

**Contents:**

- Holdings module (CRUD).
- Investment events module (buy, sell, dividend, contribution, withdrawal).
- Realized gain computation (average cost).
- Unrealized gain computation.
- Link events to money-core transactions.
- Allocation report.
- Performance over time.
- Investment accounts, holdings, buy/sell/dividend forms.
- Investment dashboard card.

**Deliverable:** Investor persona fully supported.

## Wave 3 — Internal Businesses

**Goal:** Add Freelancer + Small Business Owner personas.

**Contents:**

- Business creation flow.
- Business-specific categories.
- Business accounts + transactions.
- Owner's draw vs. salary.
- P&L computation + endpoint.
- Business net worth.
- Cash runway computation.
- Business budgets.
- Business screen (detail + accounts + transactions + P&L).
- Business dashboard card.

**Deliverable:** Freelancer + Small Business Owner personas supported.

## Wave 4 — External Businesses (Manual)

**Goal:** Add Multi-Business Owner persona with manual summaries.

**Contents:**

- External business creation.
- Summary module (manual create).
- Summary history (append-only).
- Summary correction with versioning.
- Unit label support.
- Stale-summary detection job.
- External business screen.
- External business dashboard card.

**Deliverable:** Multi-Business Owner persona (manual mode) supported.

## Wave 5 — External Businesses (API) + Polish

**Goal:** Complete the platform.

**Contents:**

- **External Business API:** REST endpoints, API token module, rotating token expiry, rate limiting, idempotency, bulk push, Swagger docs for external developers.
- **Advanced budgets:** rollover, alerts, envelope method, copy previous month.
- **Savings goals advanced:** projections, milestones.
- **Debt payoff planner:** full module and screens.
- **Insights expansion:** 7 more rules.
- **Internal → External conversion.**
- **Auto-pricing:** Alpha Vantage + Finnhub + CoinGecko with fallback.
- **Audit log UI.**
- **Tier & billing structure.**
- **Data export:** JSON, CSV, PDF.

**Deliverable:** TrellisFlow MVP complete.

## Wave 6 — Future / Post-MVP

**Goal:** Everything deferred.

- CSV import from banks.
- Bank sync (Plaid).
- Mobile app (React Native / Flutter).
- Multi-currency historical rates.
- Offline mode (Layer 1 and Layer 2).
- Family / household accounts.
- Public third-party API.
- Webhooks from TrellisFlow.
- GraphQL API.
- Internationalization.
- Two-factor authentication.
- Notifications (email + push).
- Attachments (receipt photos).

## Why Waves Matter

1. **Each wave is shippable.** Stop any time and you have a product.
2. **Each wave is testable.** Wave boundaries are natural QA checkpoints.
3. **Each wave has a clear scope.** No scope creep mid-wave.
4. **Each wave gets a tag.** `v0.1.0`, `v0.2.0`, etc.
5. **Portfolio-friendly.** "I built TrellisFlow in 6 shipping waves" is a real story.

## Wave Rules

- **Build in order.** Waves build on each other.
- **Ship each wave.** Deploy, verify, tag.
- **Don't skip.** If a later wave seems more exciting, resist.
- **Don't add to a wave mid-flight.** New ideas go to Wave 5 or 6.

## Release Milestones

Not every wave is a release. Only two waves merge to `main` during initial development:

- **Wave 0** → tag `v0.0.1-scaffold` (baseline skeleton).
- **Wave 5** → tag `v1.0.0` (MVP complete).

Waves 1–4 are internal milestones. Work accumulates on `develop`. See chapter 15 for the full Git strategy.
