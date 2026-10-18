# 07 — Database Schema

## Overview

**22 tables** across **8 logical layers**. Every table uses UUID v7 primary keys, UTC timestamps, and soft delete where applicable.

## Layer 1 — Identity

### `users`

| Column             | Type       | Notes                        |
| ------------------ | ---------- | ---------------------------- |
| id                 | UUID v7    | Primary key                  |
| email              | String     | Unique, lowercase normalized |
| email_verified_at  | Timestamp? | Nullable                     |
| password_hash      | String     | Argon2id                     |
| name               | String     | Display name                 |
| timezone           | String     | IANA format                  |
| reporting_currency | String(3)  | ISO 4217                     |
| tier               | Enum       | free / paid                  |
| persona_hint       | Enum?      | From signup                  |
| status             | Enum       | active / suspended / deleted |
| deleted_at         | Timestamp? | Soft delete                  |
| created_at         | Timestamp  | Auto                         |
| updated_at         | Timestamp  | Auto                         |

### `sessions`

Session tokens, hashed. Fields: id, user_id, token_hash, user_agent, ip_address, expires_at, revoked_at, created_at, last_used_at.

### `email_verification_tokens`

Fields: id, user_id, token_hash, purpose (email_verification | password_reset), expires_at, used_at, created_at.

## Layer 2 — Containers

### `containers`

Every account belongs to exactly one container. Fields: id, user_id, type, name, currency, status, archived_at, deleted_at, created_at, updated_at.

### `business_profiles`

Extra fields for business containers. Fields: id, container_id (unique), business_type, business_type_custom, start_date, notes, logo_url, created_at, updated_at.

### `external_business_sources`

Source config for external businesses. Fields: id, container_id (unique), source_type (manual | api), last_synced_at, last_summary_date, last_summary_at, sync_interval, created_at, updated_at.

## Layer 3 — Money Core

### `categories`

Fields: id, user_id, container_id (nullable), parent_id (nullable), name, type (income | expense), icon, color, sort_order, is_system, status, deleted_at, created_at, updated_at.

### `accounts`

Fields: id, user_id, container_id, name, category (asset | liability), account_type, currency, current_balance (cache), institution, notes, status, archived_at, deleted_at, created_at, updated_at.

### `transactions`

Fields: id, user_id, container_id, account_id, type (income | expense | transfer), amount, currency, date, category_id, description, notes, transfer_pair_id, recurring_rule_id, source (manual | recurring | imported | synced), idempotency_key, status, deleted_at, created_at, updated_at.

**Transfers create two rows joined by `transfer_pair_id`.**

### `recurring_rules`

Fields: id, user_id, container_id, account_id, type, amount, currency, category_id, transfer_to_account_id, description, frequency, interval, day_of_week, day_of_month, start_date, end_date, next_occurrence, last_generated_at, status, created_at, updated_at.

## Layer 4 — Investments

### `holdings`

Fields: id, user_id, container_id, name, asset_class, symbol, quantity, cost_basis_total, current_value_total, currency, acquired_date, pricing_mode (manual | auto), price_provider, provider_symbol, last_priced_at, notes, status, closed_at, deleted_at, created_at, updated_at.

### `investment_events`

Fields: id, user_id, container_id, holding_id (nullable), event_type, quantity, price_per_unit, total_amount, currency, date, realized_gain, related_transaction_id, notes, created_at, updated_at.

**Every cash-moving event creates a linked transaction via `related_transaction_id`.**

## Layer 5 — Summaries

### `summaries`

Append-only. Fields: id, user_id, container_id, unit, date, period, period_start, period_end, income, expenses, transfers_in, transfers_out, cash_balance, assets_value, liabilities_value, currency, notes, source (manual | api), created_at, updated_at, deleted_at.

**Unique constraint:** (container_id, date, unit).

### `summary_versions`

Fields: id, summary_id, version_number, snapshot (JSONB), edited_by, edited_at, reason.

### `api_tokens`

Fields: id, user_id, container_id, label, token_hash, token_prefix, scopes (JSONB), expires_at, last_used_at, last_used_ip, revoked_at, revoked_reason, status, created_at.

**Default expiry: 90 days. Rotation-friendly (multiple active allowed).**

## Layer 6 — Planning

### `budgets`

Fields: id, user_id, container_id, category_id, amount, currency, period, period_start, period_end, rollover, rollover_balance, method (target | envelope), status, deleted_at, created_at, updated_at.

**Spent amount is computed, never stored.**

### `savings_goals`

Fields: id, user_id, container_id, name, target_amount, currency, target_date, linked_account_id (nullable), manual_saved_amount (nullable), icon, color, notes, status, achieved_at, deleted_at, created_at, updated_at.

### `debt_payoff_plans`

Fields: id, user_id, account_id, method (snowball | avalanche | custom), extra_monthly_payment, minimum_payment, interest_rate, projected_payoff_date, projected_interest_paid, notes, status, completed_at, deleted_at, created_at, updated_at.

## Layer 7 — Reporting

### `net_worth_snapshots`

One row per user per day. Fields: id, user_id, date, total_net_worth, personal_net_worth, investments_net_worth, businesses_net_worth, breakdown (JSONB), currency, computed_at, created_at.

**Unique constraint:** (user_id, date).

### `insights`

Fields: id, user_id, type, severity (info | opportunity | warning), title, message, related_container_id, related_entity_type, related_entity_id, action_url, metadata (JSONB), status (active | dismissed | expired), dismissed_at, expires_at, created_at.

## Layer 8 — System

### `audit_logs`

Append-only, immutable. Fields: id, user_id, actor_type (user | system | external_api), actor_id, entity_type, entity_id, action (create | update | delete | restore | archive | unarchive), before (JSONB), after (JSONB), changed_fields (String[]), ip_address, user_agent, request_id, created_at.

### `job_runs`

Fields: id, job_name, started_at, completed_at, status (running | succeeded | failed | partial), processed_count, failed_count, error_message, metadata (JSONB), created_at.

## Design Rules

1. **UUID v7 primary keys** — sortable, unguessable.
2. **UTC timestamps** (`timestamptz`).
3. **Soft delete** via `deleted_at` on user-owned mutable tables.
4. **`created_at` and `updated_at`** on every mutable table.
5. **`user_id` on every user-owned table**, even when derivable.
6. **Money as `Decimal(19,4)`** — never floating point.
7. **Append-only on truth tables** (summaries, audit logs).
8. **Cache fields explicitly marked** (e.g., `accounts.current_balance`).

## Indexes

Full index list lives in the Prisma schema. Key patterns:

- `(user_id, status)` for active-record lists.
- `(container_id, date DESC)` for histories.
- `(account_id, date DESC)` for ledger queries.
- Unique constraints on `(user_id, date)` for snapshots and `(container_id, date, unit)` for summaries.

## Migrations

- **Prisma Migrate** for schema changes.
- Every migration is committed.
- Migrations are applied automatically on deploy.
- **Never edit a migration after it's merged.**
