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

- ☑ `prisma/schema.prisma` — all 22 tables
- ☑ Prisma service + module
- ☑ Pooled + direct DB URLs
- ☑ First migration
- ☑ Seed script
- ☐ Prisma tenant extension (auto `user_id` scoping)
- ☐ Unit tests for tenant extension

### 1.2 — Auth Module

- ☑ Auth module skeleton
- ☑ Signup endpoint (Argon2id)
- ☑ Login endpoint (JWT + refresh)
- ☑ Refresh endpoint (rotation)
- ☑ Logout + logout-all
- ☑ Password reset (request + confirm)
- ☑ Email verification (request + confirm + resend)
- ☑ `JwtAuthGuard` + `@CurrentUser()`
- ☑ Rate limiting on auth endpoints
- ☑ Resend email integration + templates
- ☑ Unit + integration + E2E tests
- ☐ E2E: signup → verify → login → logout (Partially done: tested signup, login, logout, reset. Email verify E2E pending.)
- ☐ Tenancy test: user A cannot see user B (Deferred to Task 1.4)
- ☑ Swagger annotations

### 1.3 — Containers

- ☑ Container module scaffold
- ☑ Auto-create Personal on signup (Done in Auth)
- ☑ BusinessProfile + ExternalBusinessSource models (Done in schema)
- ☑ Tenant guard (Done via Prisma Extension + CLS)
- ☑ Container CRUD endpoints (Create, Read, Update, Archive)
- ☑ BusinessProfile endpoints (Get, Create)
- ☑ Unit and Integration tests for ContainersService
- ☑ Swagger annotations for all endpoints
- ☑ PR: `feat(containers): container CRUD and business profile`

(Note: ExternalBusinessSource endpoints are deferred to Wave 4 — Task 4.1.)

### 1.4 — Accounts, Categories, Transactions

**Effort:** ~2 weeks · **Status:** ☑ complete

#### 1.4a — Categories Module

- ☑ Category module scaffold
- ☑ Create/Update/Archive endpoints
- ☑ Nesting support (parent category)
- ☑ Reorder endpoint
- ☑ Default category seeding on signup
- ☑ Unit tests for CategoriesService
- ☑ Swagger annotations
- ☑ PR: `feat(categories): category CRUD and default seeding`

#### 1.4b — Accounts Module

- ☑ Account module scaffold
- ☑ Create/Update/Archive endpoints
- ☑ Net worth calculation endpoint (`GET /api/accounts/net-worth`)
- ☑ Unit tests for AccountsService
- ☑ Swagger annotations
- ☑ PR: `feat(accounts): account CRUD and net worth`

#### 1.4c — Transactions Module

- ☑ Transaction module scaffold
- ☑ Create/Update/Delete endpoints
- ☑ Filters (date range, category, account, type, search)
- ☑ Pagination (cursor-based)
- ☑ Balance cache update on create/update/delete
- ☑ Unit tests for TransactionsService
- ☑ Integration test: balance update
- ☑ Swagger annotations
- ☑ PR: `feat(transactions): transaction CRUD with filters and pagination`

#### 1.4d — Transfers

- ☑ Transfer creation (two linked rows via `transfer_pair_id` in a single Prisma `$transaction`)
- ☑ Update/delete with pair management
- ☑ Balance cache updates for both accounts
- ☑ Integration test: transfer atomicity
- ☑ Integration test: cross-container transfer rejected
- ☑ PR: `feat(transfers): linked transfer transactions`

#### 1.4e — Audit Log

- ☑ AuditLogService
- ☑ Integrated into Transaction create/update/delete
- ☑ Audit viewer endpoint (`GET /api/audit`)
- ☑ Unit tests
- ☑ Integration test: logs written to DB
- ☑ Swagger annotations

#### 1.4f — E2E Tests

- ☐ E2E: signup → create account → add transaction → verify balance (deferred to end of Wave 1)
- ☐ E2E: transfer between accounts (deferred to end of Wave 1)

(Note: Full E2E tests for the Money Core will be added in Task 1.14, after the frontend exists to test the full user journey.)

**Deliverable:** ✅ Users can track personal money end-to-end. Transfers are atomic. Balances update correctly. Every write is audited.

### 1.5 — Recurring Rules

**Effort:** ~3–5 days · **Status:** ☑ complete

#### 1.5a — Backend: Module & CRUD

- ☑ `[FEAT]` RecurringRule module scaffold
- ☑ `[FEAT]` Create a rule (Income, Expense, or Transfer)
- ☑ `[FEAT]` Read/List rules
- ☑ `[FEAT]` Update a rule
- ☑ `[FEAT]` Delete a rule
- ☑ `[FEAT]` Pause / Resume a rule
- ☑ `[SEC]` Enforce ownership
- ☑ `[DOCS]` Swagger annotations

#### 1.5b — Logic: "Edit this / future / all"

- ☐ Edit this occurrence _(Deferred to Wave 5 — requires UI interaction to split rules)_
- ☐ Edit this and future _(Deferred to Wave 5)_
- ☑ Edit all (Backend supports updating the rule, affecting all future generations)
- ☐ Delete this / future / all _(Deferred to Wave 5)_

#### 1.5c — Background Job: The Generator

- ☑ `[FEAT]` Daily job to find rules where `nextOccurrence <= today`
- ☑ `[FEAT]` Generate the transaction and update account balances
- ☑ `[FEAT]` Advance `nextOccurrence` (handling end-of-month quirks)
- ☑ `[TEST]` Job idempotency
- ☑ `[TEST]` Date logic (monthly on the 31st, biweekly, yearly)

#### 1.5d — Queries: Upcoming Occurrences

- ☑ `[FEAT]` `GET /api/recurring-rules/upcoming`
- ☑ `[DOCS]` Swagger annotations

#### 1.5e — Testing & Delivery

- ☑ `[TEST]` Unit tests for all service methods
- ☑ `[TEST]` Integration tests for the generator job
- ☑ `[GIT]` PR: `feat(recurring): recurring transaction rules`

**Deliverable:** ✅ Recurring salary/rent/subscriptions auto-generate. Users can see upcoming bills. Generator is proven idempotent.

### 1.6 — Budgets

**Effort:** ~2–3 days · **Status:** ☑ complete

- ☑ Budget module scaffold
- ☑ Create/Read/Update/Delete endpoints
- ☑ Progress computation (spent, remaining, percentage)
- ☑ Budget vs. Actual report (`GET /api/budgets/report`)
- ☑ Copy previous month (`POST /api/budgets/copy-previous`)
- ☑ Unit tests (math logic, division by zero)
- ☑ Integration test (real transaction updates real budget)
- ☑ Swagger annotations
- ☑ PR: `feat(budgets): budget CRUD and progress tracking`

### 1.7 — Savings Goals

**Effort:** ~2 days · **Status:** ☑ complete

- ☑ SavingsGoal module scaffold
- ☑ Create/Read/Update/Delete endpoints
- ☑ Link to account OR manual amount
- ☑ Progress computation (currentAmount, remaining, percentage)
- ☑ Unit tests (logic math, fallback)
- ☑ Integration test (real linked account updates)
- ☑ Swagger annotations
- ☑ PR: `feat(goals): savings goal CRUD and progress tracking`

### 1.8 — Reports & Snapshots

**Effort:** ~3–4 days · **Status:** ☑ complete

- ☑ Snapshot module + compute service
- ☑ Daily snapshot job (`POST /api/snapshots/process-daily`)
- ☐ Debounced recompute (pg-boss) _(Deferred to Task 1.14 — deployment infrastructure)_
- ☑ Net worth trend endpoint (`GET /api/reports/net-worth`)
- ☑ Cash flow endpoint (`GET /api/reports/cash-flow`)
- ☑ Allocation report (`GET /api/reports/allocation`)
- ☑ PDF export (`GET /api/reports/net-worth/pdf`)
- ☑ Unit tests (snapshot math, reports math, PDF)
- ☑ Integration test (real DB snapshot + idempotency)
- ☑ Swagger annotations
- ☑ PR: `feat(reports): snapshot engine and financial reports`

### 1.9 — Insights (Basic)

**Effort:** ~2 days · **Status:** ☑ complete

- ☑ Insight module
- ☑ 3 rules (budget overspent, near limit, goal achieved)
- ☑ Generation job (`POST /api/insights/generate`)
- ☑ Dismiss / dismissAll endpoints
- ☑ Unit tests (rules, deduplication)
- ☑ Integration test (real DB)
- ☑ Swagger annotations
- ☑ PR: `feat(insights): basic rules engine and generation`

### 1.10 — Dashboard Endpoints

**Effort:** ~1–2 days · **Status:** ☑ complete

- ☑ Summary endpoint (`GET /api/dashboard/summary`)
- ☑ Net worth trend (`GET /api/dashboard/net-worth-trend`)
- ☑ Cash flow (included in summary)
- ☑ Container cards (`GET /api/dashboard/containers`)
- ☑ Insights endpoint (`GET /api/dashboard/insights`)
- ☑ Unit tests (summary aggregator, container math)
- ☑ Integration test (real DB summary and cards)
- ☑ Swagger annotations
- ☑ PR: `feat(dashboard): unified dashboard aggregator endpoints`

### 1.11 — Frontend Foundation

**Effort:** ~5 days · **Status:** ☑ complete

#### 1.11a — Foundation & Design System

- ☑ `[FEAT]` Next.js 15 (App Router) setup inside `apps/web`
- ☑ `[DOCS]` Design system tokens created in `docs/18-design-system.md`
- ☑ `[FEAT]` Tailwind CSS configuration with custom design tokens
- ☑ `[FEAT]` Next.js Fonts (Inter, JetBrains Mono)
- ☑ `[FEAT]` Global CSS setup
- ☑ `[FEAT]` Install `lucide-react` and utility packages (`clsx`, `tailwind-merge`)

#### 1.11b — Core Infrastructure

- ☑ `[FEAT]` Generated REST API client from backend Swagger/OpenAPI
- ☑ `[FEAT]` Auth Token handling (Zustand store + cookie sync)
- ☑ `[FEAT]` TanStack Query provider setup
- ☑ `[FEAT]` Base `lib/api` wrapper (inject auth headers, handle 401s)

#### 1.11c — App Shell & Layout

- ☑ `[FEAT]` App layout wrapper `(app)/layout.tsx`
- ☑ `[FEAT]` Sidebar navigation (responsive)
- ☑ `[FEAT]` Topbar (Container Switcher, Global Search, Profile Menu)
- ☑ `[FEAT]` Mobile hamburger menu and sliding drawer overlay
- ☑ `[FEAT]` Shared `Logo` component

#### 1.11d — Auth & Onboarding

- ☑ `[FEAT]` Login page (with eye toggle and standard autocomplete)
- ☑ `[FEAT]` Signup page (with eye toggle and autofill prevention)
- ☑ `[FEAT]` Forgot Password page (with real Resend email integration)
- ☑ `[FEAT]` Reset Password page (clean URL token handling, no auto-fill)
- ☑ `[FEAT]` Route protection via Next.js middleware
- ☑ `[GIT]` PR: `feat(web): foundation, shell, and authentication`

**Deliverable:** ✅ A fully functional, production-grade web app shell with authentication, protected routing, real email delivery, and responsive navigation.

### 1.12 — Frontend Screens (Wave 1)

**Effort:** ~2–3 weeks · **Status:** ☐ pending

We will build this in phases within a single `feature/screens` branch.

#### 1.12a — Dashboard (Wealth Accelerator)

- ☑ Hero Net Worth Card (total + breakdown)
- ☑ Container Cards (Personal, Investments, Businesses)
- ☑ Cash Flow Summary (this month's income vs. expenses)
- ☑ Insights Widget (top 3 insights)
- ☐ Net Worth Trend Chart (Deferred to Wave 2 — requires Recharts setup)

#### 1.12b — Personal Overview & Accounts

- ☐ `[FEAT]` Personal overview page (list of accounts with balances)
- ☐ `[FEAT]` Create/Edit Account modal form
- ☐ `[FEAT]` Account detail page (transaction history)

#### 1.12c — Transactions & Categories

- ☐ `[FEAT]` Transaction list page (filters, search, infinite scroll)
- ☐ `[FEAT]` Quick-add transaction form (modal)
- ☐ `[FEAT]` Categories management page (tree view, CRUD)
- ☐ `[FEAT]` Transfer form (modal)

#### 1.12d — Recurring Rules

- ☐ `[FEAT]` Recurring rules list page
- ☐ `[FEAT]` Create/Edit rule form
- ☐ `[FEAT]` Upcoming bills widget

#### 1.12e — Budgets & Goals

- ☐ `[FEAT]` Budgets overview page (progress bars)
- ☐ `[FEAT]` Create/Edit Budget form
- ☐ `[FEAT]` Goals overview page
- ☐ `[FEAT]` Create/Edit Goal form

#### 1.12f — Reports

- ☐ `[FEAT]` Reports landing page
- ☐ `[FEAT]` Net Worth Statement page (with PDF download button)
- ☐ `[FEAT]` Cash Flow Statement page
- ☐ `[FEAT]` Allocation Report page
- ☐ `[FEAT]` Budget vs. Actual report page

#### 1.12g — Insights & Settings

- ☐ `[FEAT]` Insights full page (list, dismiss all)
- ☐ `[FEAT]` Settings: Profile & Preferences
- ☐ `[FEAT]` Settings: Security & Sessions
- ☐ `[FEAT]` Settings: Containers
- ☐ `[FEAT]` Settings: Audit Log

#### 1.12h — Shared UI Components

- ☐ `[FEAT]` Empty states (every list)
- ☐ `[FEAT]` Loading skeletons
- ☐ `[FEAT]` Toasts for success/error feedback
- ☐ `[FEAT]` Modal / Dialog primitive
- ☐ `[FEAT]` Amount formatting utility component

- ☐ `[GIT]` PR: `feat(web): complete application screens for Wave 1`

**Deliverable:** ✅ A complete, navigable, beautiful UI for the entire Wave 1 feature set.

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
