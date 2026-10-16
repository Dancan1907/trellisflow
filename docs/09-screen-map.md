# 09 — Screen Map

## Overview

TrellisFlow has approximately **60 screens** across 8 sections. Each screen has a route, a purpose, and a defined audience (public / user / verified user).

## Part 1 — Public Screens

| Route                    | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `/`                      | Landing — explain TrellisFlow, drive signups |
| `/signup`                | Create an account                            |
| `/login`                 | Authenticate                                 |
| `/verify-email/:token`   | Confirm email                                |
| `/forgot-password`       | Request password reset                       |
| `/reset-password/:token` | Set new password                             |
| `/privacy`               | Privacy policy                               |
| `/terms`                 | Terms of service                             |

## Part 2 — Onboarding

| Route         | Purpose                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `/onboarding` | 5-step welcome flow: greeting, first account, first transaction, optional investments, optional business |

Shown only once, immediately after signup.

## Part 3 — Core App (Personal)

| Route                        | Purpose                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `/dashboard`                 | The Wealth Accelerator — total net worth, trend, cash flow, container cards, insights |
| `/personal`                  | Personal overview                                                                     |
| `/personal/accounts`         | Manage accounts                                                                       |
| `/personal/accounts/:id`     | One account's history                                                                 |
| `/personal/transactions`     | Browse transactions with filters, grouped view, infinite scroll                       |
| `/personal/transactions/:id` | Edit or view a transaction                                                            |
| `/personal/categories`       | Manage categories (tree view)                                                         |
| `/personal/recurring`        | Manage recurring rules                                                                |

## Part 4 — Investments

| Route                       | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `/investments`              | Portfolio summary, allocation, top holdings |
| `/investments/accounts`     | Investment accounts list                    |
| `/investments/accounts/:id` | One investment account's holdings           |
| `/investments/holdings/new` | Add a holding                               |
| `/investments/holdings/:id` | One holding's history and events            |
| `/investments/events`       | Activity log (buy/sell/dividend)            |

## Part 5 — Businesses

| Route                          | Purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `/businesses`                  | List all businesses (internal + external)                        |
| `/businesses/new`              | Create a business (requires verified email for external)         |
| `/businesses/:id`              | Business detail (P&L for internal, summary history for external) |
| `/businesses/:id/accounts`     | Business accounts (internal only)                                |
| `/businesses/:id/transactions` | Business transactions (internal only)                            |
| `/businesses/:id/summaries`    | Summary history (external only)                                  |
| `/businesses/:id/settings`     | Business profile, source config, danger zone                     |
| `/businesses/:id/tokens`       | API token management (external only, requires verified email)    |

## Part 6 — Budgets, Goals, Debt

| Route          | Purpose                           |
| -------------- | --------------------------------- |
| `/budgets`     | All budgets overview              |
| `/budgets/new` | Create a budget                   |
| `/budgets/:id` | One budget's progress and history |
| `/goals`       | All savings goals                 |
| `/goals/new`   | Create a goal                     |
| `/goals/:id`   | One goal's progress               |
| `/debt`        | All debt payoff plans             |
| `/debt/:id`    | One debt's plan and projection    |

## Part 7 — Reports & Insights

| Route                       | Purpose                            |
| --------------------------- | ---------------------------------- |
| `/reports`                  | Reports landing                    |
| `/reports/net-worth`        | Net worth statement with breakdown |
| `/reports/cash-flow`        | Cash flow statement                |
| `/reports/profit-loss`      | Business P&L                       |
| `/reports/allocation`       | Allocation report                  |
| `/reports/budget-vs-actual` | Budget vs. Actual                  |
| `/insights`                 | All insights                       |

## Part 8 — Settings

| Route                   | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| `/settings`             | Settings landing                         |
| `/settings/profile`     | Name, email, password                    |
| `/settings/preferences` | Timezone, currency, date format, theme   |
| `/settings/containers`  | Manage containers                        |
| `/settings/sessions`    | Active sessions                          |
| `/settings/security`    | Password, email verification, future 2FA |
| `/settings/tier`        | Subscription management                  |
| `/settings/data`        | Export, delete, audit access             |
| `/settings/audit`       | Personal activity trail                  |

## Part 9 — Admin (Deferred)

| Route          | Purpose            |
| -------------- | ------------------ |
| `/admin/jobs`  | Job runs dashboard |
| `/admin/users` | User management    |

Not in scope for MVP. Reserved for future.

## Global Elements

**Every authenticated page includes:**

- **Top bar:** Logo, container switcher, global search, insights bell, profile menu.
- **Sidebar (desktop) / bottom nav (mobile):** Dashboard, Money (Personal + Investments + Businesses), Plan (Budgets + Goals + Debt), Reports, Settings.
- **Quick-add button:** Floating action for transaction, holding, or summary.
- **Toasts and modals** for feedback.
- **Empty states** everywhere.

## Screen Count

| Section                | Count |
| ---------------------- | ----- |
| Public                 | 8     |
| Onboarding             | 1     |
| Core (Personal)        | 7     |
| Investments            | 6     |
| Businesses             | 8     |
| Budgets / Goals / Debt | 8     |
| Reports & Insights     | 7     |
| Settings               | 9     |
| Admin (deferred)       | 2     |

**~60 screens total.**

## Navigation Strategy

- **Sidebar groups by domain**, not by container.
- **Container switcher in top bar** for quick jumps.
- **URL is state** — filters and view modes live in query params.
- **Adaptive nav** — only shows containers the user has activated.

## Design Principles Across Screens

1. **Every list paginates or infinite-scrolls.** Never load everything.
2. **Every screen has loading, empty, and error states.**
3. **Every mutation gives feedback** — toast, inline, or optimistic.
4. **Amounts are always formatted** with currency, thousands separator, and sign (not just color).
5. **Mobile-responsive** — designed for 375px and up.
