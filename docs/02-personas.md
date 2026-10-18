# 02 — Personas

## Why We Define Personas

Personas are not marketing categories. They are **constraints on the design** — they tell us what the app must feel like, what features matter, and what to defer.

A key insight from design:

> Personas are not different _people_. They are **roles a single person plays**. The same person can be an Employee and an Investor and a Small Business Owner simultaneously.

This drives the most important persona decision: **we do not route users by persona**. Everyone gets the same adaptive dashboard, and containers appear as the user activates them.

## The Five Personas

### 1. The Employee

**Profile:** Fixed salary, predictable lifestyle expenses, simple savings.

**Core need:** See salary come in, expenses go out, savings grow. Watch net worth trend up over time.

**Container focus:** Personal (only).

**Key features:**

- Transactions (income, expense, transfer).
- Categories for expense analysis.
- Recurring rules for salary, rent, subscriptions.
- Budgets (simple targets per category).
- Net worth trend line.

**Not needed:** Investments, businesses.

### 2. The Freelancer / Side-Hustler

**Profile:** Irregular income, mixed personal/business expenses, tax complexity.

**Core need:** Separate personal money from business money, smooth cash flow, track business profitability.

**Container focus:** Personal + Internal Business.

**Key features:**

- All Employee features, plus:
- One or more internal businesses.
- Business-specific categories.
- Business P&L (income vs. expenses).
- Owner's draw vs. salary distinction.
- Business cash runway.

**Not needed:** External business APIs (unless they scale).

### 3. The Small Business Owner

**Profile:** Runs 1–2 businesses with no dedicated platform. Wants lightweight P&L without QuickBooks.

**Core need:** Track business money without enterprise accounting software.

**Container focus:** Personal + Internal Business(es).

**Key features:**

- Same as Freelancer, but:
- Multiple businesses.
- Business-specific reporting.
- Business budgets.
- Business net worth as part of total.

**Not needed:** Full accounting (invoices, payroll, inventory) — deliberately out of scope.

### 4. The Multi-Business Owner ("The Musk")

**Profile:** Complex ecosystem of multiple businesses — some internal, some external with their own systems.

**Core need:** A high-level command center that aggregates fragmented data into one macro net worth.

**Container focus:** Personal + Investments + Internal Business(es) + External Business(es).

**Key features:**

- All previous features, plus:
- External businesses with summary ingestion.
- API tokens for external business integration.
- Stale-summary detection.
- Consolidated net worth across everything.

**Not needed:** Operational tracking of external businesses — that lives in _their_ systems.

### 5. The Investor

**Profile:** Focused on stocks, crypto, real estate, venture equity.

**Core need:** Track holdings, unrealized and realized gains, allocation, performance.

**Container focus:** Personal + Investments.

**Key features:**

- Investment accounts (multiple brokers).
- Holdings (name, asset class, quantity, cost basis, current value).
- Buy/sell/dividend/contribution/withdrawal events.
- Unrealized gain/loss.
- Realized gain/loss (income).
- Allocation charts.
- Average cost basis method.

**Not needed:** Lot-level tracking (FIFO/LIFO) — deferred.

## The Combined User

The five personas combine naturally. A real TrellisFlow user might:

- Work a job (Employee).
- Own stocks and crypto (Investor).
- Run a side business (Freelancer).
- Own a small shop (Small Business Owner).
- Have equity in a bigger company (Multi-Business Owner).

**This user sees all four containers on their dashboard**, each with its own card, all rolling into one net worth.

## Design Implications

From these personas, several design decisions follow:

1. **No persona routing.** One adaptive dashboard. Containers appear as activated.
2. **All four containers are first-class.** No container is "for advanced users."
3. **Default experience is Personal.** Every user gets a Personal container on signup.
4. **Business types matter but aren't rigid.** Fixed list + custom fallback.
5. **Investments are their own container.** Not a tag on Personal.
6. **External businesses are a first-class concept.** Not an afterthought.
7. **Simple budgets for everyone.** Advanced budgeting (envelopes, rollovers) later.

## Why Not Fold Investors into Other Personas?

An earlier draft considered treating investments as "just another asset type." We rejected this because:

- **Investors have different mental models.** They think in allocations, yields, cost basis — not budgets.
- **The features differ.** Investment events (buy/sell/dividend) are fundamentally different from transactions.
- **The dashboard differs.** Investors want allocation charts and performance graphs, not expense breakdowns.
- **Folding them in makes TrellisFlow "a budget tool with a spreadsheet."** Making them first-class makes it a wealth command center.

## Signup Persona Hint

At signup, the user answers one question: "What best describes you right now?"

Options:

- I just want to track my personal money → Personal activated.
- I have investments to track → Investments activated.
- I have a business or side hustle → Internal Business suggested.
- I have several businesses → Multiple Business containers suggested.

**This is a hint, not a lock.** The user can activate any container from settings at any time. The hint just customizes onboarding.
