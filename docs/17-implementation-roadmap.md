# 17 — Implementation Roadmap

> Ordered build plan. Every feature, in the order it will be built. Wave by wave.

**Legend:** ☐ not started · ☑ done
**Effort:** S (< 1 day) · M (1–3 days) · L (3–5 days) · XL (5+ days)

---

## Wave 0 — Setup & Foundations

**Effort:** 3–5 days · **Status:** ☑ complete

- ☑ Git repo + branch protection
- ☑ pnpm workspace + Turborepo
- ☑ `apps/api` (NestJS skeleton)
- ☑ `apps/web` (Next.js skeleton)
- ☑ `packages/shared` (enums, constants)
- ☑ ESLint, Prettier, Husky, commitlint, lint-staged
- ☑ `.env.example` files
- ☑ CI workflow (lint + typecheck + build)
- ☑ Project Bible documentation
- ☑ Root README, CONTRIBUTING, runbook

---

## Wave 1 — Foundation (V0.1 "First Ship")

**Effort:** 3–5 weeks

### 1.1 — Database & Prisma

- ☐ `prisma/schema.prisma` — all 22 tables
- ☐ Prisma service + module
- ☐ Pooled + direct DB URLs
- ☐ First migration
- ☐ Seed script
- ☐ Prisma tenant extension (auto `user_id` scoping)
- ☐ Unit tests for tenant extension

### 1.2 — Auth Module

- ☐ Auth module skeleton
- ☐ Signup endpoint (Argon2id)
- ☐ Login endpoint (JWT + refresh)
- ☐ Refresh endpoint (rotation)
- ☐ Logout + logout-all
- ☐ Password reset (request + confirm)
- ☐ Email verification (request + confirm + resend)
- ☐ `JwtAuthGuard` + `@CurrentUser()`
- ☐ Rate limiting on auth endpoints
- ☐ Resend email integration + templates
- ☐ Unit + integration + E2E tests
- ☐ Swagger annotations

### 1.3 — Containers

- ☐ Container module (CRUD + archive)
- ☐ Auto-create Personal on signup
- ☐ BusinessProfile + ExternalBusinessSource models
- ☐ Tenant guard
- ☐ Tests

### 1.4 — Accounts, Categories, Transactions

- ☐ Account module (CRUD + archive)
- ☐ Category module (CRUD + nest + reorder)
- ☐ Transaction module (CRUD)
- ☐ Transfer creation (two linked rows, one DB transaction)
- ☐ Balance cache update logic
- ☐ Filters + pagination
- ☐ Audit log integration
- ☐ Default category seeding
- ☐ Unit + integration tests
- ☐ Swagger annotations

### 1.5 — Recurring Rules

- ☐ RecurringRule module (CRUD + pause/resume)
- ☐ Recurring generator job
- ☐ "Edit this / future / all" logic
- ☐ Upcoming occurrences
- ☐ Tests

### 1.6 — Budgets

- ☐ Budget module (CRUD)
- ☐ Progress computation
- ☐ Budget vs. Actual endpoint
- ☐ Copy previous month
- ☐ Tests

### 1.7 — Savings Goals

- ☐ SavingsGoal module (CRUD)
- ☐ Link to account OR manual amount
- ☐ Progress computation
- ☐ Tests

### 1.8 — Reports & Snapshots

- ☐ Snapshot module + compute service
- ☐ Daily snapshot job
- ☐ Debounced recompute (pg-boss)
- ☐ Net worth + cash flow + Budget vs Actual endpoints
- ☐ Allocation report
- ☐ PDF export
- ☐ Tests

### 1.9 — Insights (Basic)

- ☐ Insight module
- ☐ 3 rules (budget overspent, near limit, goal achieved)
- ☐ Generation job
- ☐ Dismiss / dismissAll
- ☐ Tests

### 1.10 — Dashboard Endpoints

- ☐ Summary endpoint
- ☐ Net worth trend
- ☐ Cash flow
- ☐ Container cards
- ☐ Insights endpoint
- ☐ Tests

### 1.11 — Frontend Foundation

- ☐ Next.js app shell
- ☐ Tailwind + shadcn/ui
- ☐ Layout: sidebar, topbar, container switcher, quick-add
- ☐ Auth pages
- ☐ Onboarding flow
- ☐ Generated REST client
- ☐ Auth token handling
- ☐ TanStack Query setup
- ☐ Error/loading/empty components

### 1.12 — Frontend Screens (Wave 1)

- ☐ Dashboard (Wealth Accelerator)
- ☐ Personal overview
- ☐ Personal accounts, transactions, categories, recurring
- ☐ Budgets, goals
- ☐ Reports (net worth, cash flow, budget vs actual)
- ☐ Insights page
- ☐ Settings (all sub-pages)

### 1.13 — Testing & CI

- ☐ Unit tests (90% services)
- ☐ Integration tests
- ☐ E2E: signup → add account → add transaction → net worth
- ☐ E2E: budget flow, password reset, mobile viewport
- ☐ CI: unit + integration stages
- ☐ Coverage thresholds enforced

### 1.14 — Deployment

- ☐ Deploy staging (Vercel + Render + Neon staging)
- ☐ Smoke test staging
- ☐ Deploy production
- ☐ Migration to Neon production
- ☐ Domain setup
- ☐ Uptime + Sentry monitoring
- ☐ Backup verified
- ☐ Tag `v0.1.0`

**Deliverable:** V0.1 live at `trellisflow.com`.

---

## Wave 2 — Investments

**Effort:** 1.5–2 weeks

- ☐ Holding module (CRUD)
- ☐ InvestmentEvent module (buy, sell, dividend, contribution, withdrawal)
- ☐ Realized gain (average cost)
- ☐ Unrealized gain (derived)
- ☐ Link events to transactions
- ☐ Allocation report
- ☐ Performance over time
- ☐ Frontend: investment accounts, holdings, events, allocation chart
- ☐ Tests: gains math, partial sells, buy/sell flow
- ☐ E2E: add holding → buy → sell → realized gain
- ☐ Deploy + tag `v0.2.0`

---

## Wave 3 — Internal Businesses

**Effort:** ~2 weeks

- ☐ Business creation flow
- ☐ Business-specific categories
- ☐ Business accounts + transactions
- ☐ Owner's draw vs. salary
- ☐ P&L computation + endpoint
- ☐ Business net worth
- ☐ Cash runway
- ☐ Business budgets
- ☐ Business reports
- ☐ Frontend: business detail, accounts, transactions, P&L
- ☐ Business dashboard card
- ☐ Tests
- ☐ E2E: create business → add transaction → P&L
- ☐ Deploy + tag `v0.3.0`

---

## Wave 4 — External Businesses (Manual)

**Effort:** ~1.5 weeks

- ☐ External business creation
- ☐ Summary module (manual)
- ☐ Summary history (append-only)
- ☐ Summary correction with versioning
- ☐ Unit label support
- ☐ Stale-summary detection job
- ☐ Roll-up includes external businesses
- ☐ Frontend: detail, summaries, add summary form
- ☐ External dashboard card
- ☐ Tests
- ☐ E2E: create external → add summary → net worth
- ☐ Deploy + tag `v0.4.0`

---

## Wave 5 — External API + Polish

**Effort:** 3–4 weeks

### 5.1 — External Business API

- ☐ `POST /v1/summary` (single + bulk)
- ☐ `GET /v1/business`
- ☐ `GET /v1/summary/latest`
- ☐ API token module (create/rotate/revoke)
- ☐ Rotating token expiry + warnings
- ☐ Payload validation
- ☐ Rate limiting per token
- ☐ Idempotency keys
- ☐ Public API docs
- ☐ Tests

### 5.2 — Advanced Budgets

- ☐ Rollover budgets
- ☐ Budget alerts
- ☐ Envelope method
- ☐ Copy previous month UI
- ☐ Business budgets UI
- ☐ Unbudgeted spending report

### 5.3 — Savings Goals Advanced

- ☐ Projected completion
- ☐ Milestone alerts
- ☐ Progress charts

### 5.4 — Debt Payoff Planner

- ☐ DebtPayoffPlan module
- ☐ Snowball / avalanche
- ☐ Projections
- ☐ Cross-debt strategy view
- ☐ Screens
- ☐ Completion alerts

### 5.5 — Insights Expansion

- ☐ 7 additional rules

### 5.6 — Internal → External Conversion

- ☐ Conversion flow
- ☐ Continuity in trend
- ☐ UI

### 5.7 — Auto-Pricing

- ☐ Alpha Vantage + Finnhub (stocks)
- ☐ CoinGecko (crypto)
- ☐ Fallback logic
- ☐ Refresh job
- ☐ UI toggle

### 5.8 — Audit Log UI

- ☐ Audit screen
- ☐ Entity history viewer
- ☐ Filters

### 5.9 — Tier & Billing Structure

- ☐ Tier enforcement
- ☐ Limit checks
- ☐ Upgrade/downgrade screens
- ☐ Stripe (optional)

### 5.10 — Data Export

- ☐ JSON export
- ☐ CSV export
- ☐ PDF export

### 5.11 — Release

- ☐ Full regression
- ☐ Load test
- ☐ Security audit
- ☐ Deploy production
- ☐ Tag `v1.0.0`

**Deliverable:** MVP complete.

---

## Wave 6 — Future / Post-MVP

- ☐ CSV import from banks
- ☐ Bank sync (Plaid)
- ☐ Mobile app (React Native / Flutter)
- ☐ Multi-currency historical rates
- ☐ Offline mode (Layer 1 and 2)
- ☐ Family / household accounts
- ☐ Public third-party API + developer portal
- ☐ Webhooks from TrellisFlow
- ☐ GraphQL API
- ☐ Internationalization
- ☐ Two-factor authentication
- ☐ Notifications (email + push)
- ☐ Attachments (receipts)

---

## Cross-Cutting Activities (Every Wave)

### Git

- ☐ Branch off `develop` for features
- ☐ Conventional commits
- ☐ Push + PR
- ☐ CI green
- ☐ Merge
- ☐ Delete branch

### Testing

- ☐ Unit tests
- ☐ Integration tests
- ☐ Component tests (logic-heavy)
- ☐ E2E for critical paths
- ☐ Coverage thresholds met

### Documentation

- ☐ Swagger annotations
- ☐ Update Project Bible if design changed
- ☐ Update README if user-facing
- ☐ Update runbook if a new problem was solved

### Deployment

- ☐ Deploy staging first
- ☐ Smoke test staging
- ☐ Promote to production

### Monitoring

- ☐ Verify Sentry is clean
- ☐ Check uptime
- ☐ Review logs

### Security

- ☐ `pnpm audit`
- ☐ Review new dependencies
- ☐ Verify no secrets committed
- ☐ Test tenancy isolation for new entities
