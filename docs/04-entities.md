# 04 — Core Entities

## What This Chapter Is

The complete list of nouns in TrellisFlow. Every database table, every domain object, every concept the system speaks. If it's not here, it doesn't exist.

Entities are grouped by domain. Each entry states what it is, what it belongs to, and its key fields.

## A. Identity

### User

The owner of one isolated financial world.

**Fields:** id, email, email_verified_at, password_hash, name, timezone, reporting_currency, tier, persona_hint, status, deleted_at, created_at, updated_at.

**Owns:** everything below.

### Session

An authenticated login (JWT refresh token record).

**Fields:** id, user_id, token_hash, user_agent, ip_address, expires_at, revoked_at, created_at, last_used_at.

### EmailVerificationToken

Short-lived tokens for email verification and password reset.

**Fields:** id, user_id, token_hash, purpose (email_verification | password_reset), expires_at, used_at, created_at.

## B. Containers

### Container

The unified grouping object. Every account belongs to exactly one.

**Fields:** id, user_id, type (personal | investment | internal_business | external_business), name, currency, status (active | archived | deleted), archived_at, deleted_at, created_at, updated_at.

### BusinessProfile

Extra fields for internal and external business containers.

**Fields:** id, container_id, business_type, business_type_custom, start_date, notes, logo_url, created_at, updated_at.

### ExternalBusinessSource

Source configuration for external businesses.

**Fields:** id, container_id, source_type (manual | api), last_synced_at, last_summary_date, last_summary_at, sync_interval, created_at, updated_at.

## C. Money Core

### Account

Where money sits.

**Fields:** id, user_id, container_id, name, category (asset | liability), account_type, currency, current_balance (cached), institution, notes, status, archived_at, deleted_at, created_at, updated_at.

### Category

A label for income or expense transactions.

**Fields:** id, user_id, container_id (nullable), parent_id (nullable), name, type (income | expense), icon, color, sort_order, is_system, status, deleted_at, created_at, updated_at.

### Transaction

A single money event.

**Fields:** id, user_id, container_id, account_id, type (income | expense | transfer), amount, currency, date, category_id, description, notes, transfer_pair_id, recurring_rule_id, source (manual | recurring | imported | synced), idempotency_key, status (pending | posted | reconciled), deleted_at, created_at, updated_at.

**Key rule:** transfers create two linked rows joined by `transfer_pair_id`.

### RecurringRule

A template that generates transactions on a schedule.

**Fields:** id, user_id, container_id, account_id, type, amount, currency, category_id, transfer_to_account_id, description, frequency, interval, day_of_week, day_of_month, start_date, end_date, next_occurrence, last_generated_at, status, created_at, updated_at.

## D. Investments

### Holding

A single investment position.

**Fields:** id, user_id, container_id, name, asset_class, symbol, quantity, cost_basis_total, current_value_total, currency, acquired_date, pricing_mode (manual | auto), price_provider, provider_symbol, last_priced_at, notes, status (open | closed | deleted), closed_at, deleted_at, created_at, updated_at.

**Derived:** unrealized_gain = current_value_total − cost_basis_total.

### InvestmentEvent

Buy, sell, dividend, contribution, withdrawal.

**Fields:** id, user_id, container_id, holding_id (nullable), event_type, quantity, price_per_unit, total_amount, currency, date, realized_gain, related_transaction_id, notes, created_at, updated_at.

**Key rule:** every cash-moving event creates a linked transaction in the money core.

## E. Summaries

### Summary

A periodic financial snapshot from an external business.

**Fields:** id, user_id, container_id, unit, date, period, period_start, period_end, income, expenses, transfers_in, transfers_out, cash_balance, assets_value, liabilities_value, currency, notes, source (manual | api), created_at, updated_at, deleted_at.

**Rule:** append-only. Corrections go through SummaryVersion.

### SummaryVersion

Edit history for a summary.

**Fields:** id, summary_id, version_number, snapshot (JSONB), edited_by, edited_at, reason.

### ApiToken

Authorization token for external businesses to push summaries.

**Fields:** id, user_id, container_id, label, token_hash, token_prefix, scopes (JSONB), expires_at, last_used_at, last_used_ip, revoked_at, revoked_reason, status, created_at.

## F. Planning

### Budget

A spending target for a category over a period.

**Fields:** id, user_id, container_id, category_id, amount, currency, period, period_start, period_end, rollover, rollover_balance, method (target | envelope), status, deleted_at, created_at, updated_at.

**Rule:** spent is computed, never stored.

### SavingsGoal

A target to accumulate money.

**Fields:** id, user_id, container_id, name, target_amount, currency, target_date, linked_account_id (nullable), manual_saved_amount (nullable), icon, color, notes, status, achieved_at, deleted_at, created_at, updated_at.

### DebtPayoffPlan

A strategy for eliminating a liability.

**Fields:** id, user_id, account_id, method (snowball | avalanche | custom), extra_monthly_payment, minimum_payment, interest_rate, projected_payoff_date, projected_interest_paid, notes, status, completed_at, deleted_at, created_at, updated_at.

**Rule:** one plan per liability account.

## G. Reporting

### NetWorthSnapshot

One row per user per day. Precomputed.

**Fields:** id, user_id, date, total_net_worth, personal_net_worth, investments_net_worth, businesses_net_worth, breakdown (JSONB), currency, computed_at, created_at.

**Rule:** unique per (user, date).

### Insight

A generated observation for the dashboard.

**Fields:** id, user_id, type, severity (info | opportunity | warning), title, message, related_container_id, related_entity_type, related_entity_id, action_url, metadata (JSONB), status (active | dismissed | expired), dismissed_at, expires_at, created_at.

## H. System

### AuditLog

Every mutation of financial truth. Append-only, immutable.

**Fields:** id, user_id, actor_type (user | system | external_api), actor_id, entity_type, entity_id, action (create | update | delete | restore | archive | unarchive), before (JSONB), after (JSONB), changed_fields (String[]), ip_address, user_agent, request_id, created_at.

**Rule:** never deleted while user exists.

### JobRun

A log of scheduled jobs.

**Fields:** id, job_name, started_at, completed_at, status (running | succeeded | failed | partial), processed_count, failed_count, error_message, metadata (JSONB), created_at.

## Entity Relationship Map

```
User
 ├── Session
 ├── EmailVerificationToken
 ├── Container
 │    ├── Account → Transaction, RecurringRule
 │    ├── Category
 │    ├── Holding → InvestmentEvent
 │    ├── Summary → SummaryVersion
 │    ├── ApiToken
 │    ├── Budget
 │    ├── SavingsGoal
 │    ├── DebtPayoffPlan (via Account)
 │    ├── BusinessProfile (if business)
 │    └── ExternalBusinessSource (if external)
 ├── NetWorthSnapshot
 ├── Insight
 └── AuditLog

System:
 └── JobRun
```

## Total Counts

- **22 tables** total.
- **18 user-owned tables** (all have `user_id`).
- **1 global table** (JobRun).
- **3 tables that support external integration** (Summary, SummaryVersion, ApiToken).
- **2 tables that precompute** (NetWorthSnapshot, Insight).

## What Is Deliberately Not an Entity

- **Team / Collaborator** — D3 forbids it.
- **Notification** — deferred to a later wave.
- **Attachment** — deferred (receipts, photos).
- **Tag** — categories cover the need.
- **ExchangeRate** — multi-currency uses current rates only (Interpretation A).
- **Subscription / Billing** — deferred until paid tiers exist.
- **TwoFactorAuth** — deferred.

Each of these can be added later without breaking the model — the test of a good schema.
