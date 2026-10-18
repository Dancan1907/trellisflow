# 03 — Container Model

## The Central Abstraction

Everything in TrellisFlow's money model lives inside a **container**. A container is a top-level grouping of:

- Accounts.
- Transactions.
- Categories (optionally scoped).
- Recurring rules.
- Budgets.
- Goals (savings, debt).
- Summaries (external businesses only).

A container is either **Personal**, **Investments**, **Internal Business**, or **External Business**.

## Why Containers?

Without containers, we'd need separate data models for "personal money," "business money," and "investment money." That would triple the code, break DRY, and make net worth roll-up a nightmare.

With containers, we have:

- **One money engine.** Accounts, transactions, categories — shared by all.
- **One net worth formula.** Sum of all containers, adjusted for liabilities.
- **One set of screens.** With container-specific variations.
- **Extensibility.** Adding a future container type ("Trust," "Joint Account") doesn't require new code.

## The Four Container Types

### 1. Personal

- Auto-created on signup.
- Cannot be deleted (only archived, and even then, force-kept).
- Holds personal accounts: checking, savings, cash, mobile money, credit cards, loans.
- Its net worth is: assets − liabilities.

### 2. Investment

- Created when the user activates investments.
- Holds one or more investment accounts (brokerages, crypto exchanges, retirement accounts).
- Its net worth is: sum of holding values + cash sleeve.
- Uses a different transaction model: **investment events** (buy, sell, dividend, etc.) rather than plain transactions.

### 3. Internal Business

- Created when the user adds a business that lives entirely inside TrellisFlow.
- Holds its own accounts (asset + liability).
- Uses the same transaction model as Personal, with business-specific categories.
- Produces a P&L statement (income − expenses) — something Personal doesn't.
- Produces a business net worth (assets − liabilities).
- Supports owner's draw vs. salary on withdrawals.
- Has a business profile (name, type, status, currency, start date).
- Optionally has cash runway detection.

### 4. External Business

- Created when a user has a business whose operations live elsewhere.
- Holds **summaries** — periodic financial snapshots pushed (manually or via API) by the external system.
- Its net worth is: latest summary's assets − liabilities.
- Uses rotating API tokens for authentication.
- Supports a source config (manual or API).
- Optionally carries a `unit` label per summary for user-side organization (does not affect math).

## The Universal Layer

All four containers roll up into one:

```
Total Net Worth =
    Personal Net Worth
  + Investments Net Worth
  + Σ (Internal Business Net Worth)
  + Σ (External Business Net Worth)
```

And for cash flow:

```
Total Monthly Cash Flow =
    Personal Cash Flow
  + Investments Cash Flow
  + Σ (Internal Business Cash Flow)
  + Σ (External Business Cash Flow)
```

**Transfers never appear in roll-ups.** They move money _within_ the user's world; they don't change total net worth.

## Container Rules

1. **Personal is guaranteed.** Every user has exactly one.
2. **Every container has a currency.** Multi-currency is handled at the account level.
3. **Every account belongs to exactly one container.** No cross-container accounts.
4. **Containers are soft-deleted.** Archive by default; hard delete is buried.
5. **Containers can be converted (Internal → External)** when the user builds their own site, preserving history.
6. **Containers are user-owned.** No sharing, no collaboration (D3).

## Why One Personal Container, Not Many

We considered allowing multiple Personal containers (e.g., "Personal Kenya" and "Personal US"). We rejected this because:

- Multi-currency is handled at the _account_ level (accounts have their own currency).
- Users think of "my money" as one place.
- Splitting Personal would complicate roll-up and filters for no benefit.

## Why Internal Business ≠ Personal Accounts Labeled "Business"

An earlier draft considered "just tag some accounts as business accounts." We rejected this because:

- Businesses need **P&L**, which is a business-level concept, not an account-level one.
- Businesses need **business-level status** (planning, active, paused, closed).
- Businesses need **business-specific categories** (e.g., "Inventory" for a shop, "Feed" for a farm).
- A user might have 5 businesses; the dashboard needs a card per business.

Making business a first-class container gives us these for free.

## Why External Business ≠ Internal Business with a Source Flag

An external business has fundamentally different data:

- Internal businesses store **transactions**.
- External businesses store **summaries** (pre-aggregated flows and balances).

These are different models. Trying to unify them would corrupt one side. Keeping them separate is honest.

## Conversion Path (Internal → External)

When a user builds their own site for a business that was internal:

1. **Freeze internal transactions.** TrellisFlow stops accepting new transactions for the business.
2. **Preserve history.** Historical transactions remain visible as "historical (internal)."
3. **Change source to external.** The business is now marked as external with manual or API source.
4. **Begin summaries.** From the conversion date, summaries arrive.
5. **Continuity.** The net worth trend line is continuous across the conversion.

The user never loses data or breaks reporting.

## Container Lifecycle

```
Created
   ↓
Active  ←→  Paused (optional)
   ↓
Archived   (hidden from dashboard, kept for history)
   ↓
Deleted    (soft; hard delete requires explicit action)
```

## Container Summary

| Container         | Money model       | Net worth source            | Special features                        |
| ----------------- | ----------------- | --------------------------- | --------------------------------------- |
| Personal          | Transactions      | Assets − Liabilities        | Categories, budgets, goals              |
| Investments       | Investment events | Holdings value + cash       | Unrealized/realized gains, allocation   |
| Internal Business | Transactions      | Assets − Liabilities        | P&L, business categories, runway        |
| External Business | Summaries         | Latest assets − liabilities | API tokens, stale detection, unit label |
