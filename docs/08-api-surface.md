# 08 — API Surface

## Overview

TrellisFlow exposes **two API surfaces**:

1. **Internal API (REST)** — used by the web frontend and future mobile apps.
2. **External API (REST)** — used by external businesses to push summaries.

Both are REST. Both are served by the same NestJS backend. Both use JSON.

**Why REST for both?**

- Universal — works from Swift, Kotlin, Flutter, Python, anything.
- Standard — Swagger, Postman, Postman collections all work.
- Team-friendly — clear contract between frontend and backend.
- Future-proof — mobile apps, third parties, and integrations all speak REST.

## Internal API

**Base path:** `/api`

**Auth:** Bearer JWT (access token), obtained from `/api/auth/login`.

**Docs:** Swagger UI at `/api/docs` (dev and staging only; production gated).

### Route Groups

| Group           | Base path              | Purpose                                                            |
| --------------- | ---------------------- | ------------------------------------------------------------------ |
| Auth            | `/api/auth`            | Signup, login, refresh, logout, password reset, email verification |
| Users           | `/api/users`           | Profile, preferences, sessions                                     |
| Containers      | `/api/containers`      | Personal, Investments, Businesses                                  |
| Accounts        | `/api/accounts`        | Accounts under containers                                          |
| Categories      | `/api/categories`      | Income/expense categories                                          |
| Transactions    | `/api/transactions`    | Money events                                                       |
| Recurring Rules | `/api/recurring-rules` | Scheduled transactions                                             |
| Investments     | `/api/investments`     | Holdings and events                                                |
| Summaries       | `/api/summaries`       | External business summaries                                        |
| API Tokens      | `/api/api-tokens`      | External integration tokens                                        |
| Budgets         | `/api/budgets`         | Budget targets and progress                                        |
| Goals           | `/api/goals`           | Savings goals                                                      |
| Debt            | `/api/debt-plans`      | Debt payoff plans                                                  |
| Dashboard       | `/api/dashboard`       | Aggregated dashboard data                                          |
| Insights        | `/api/insights`        | Dashboard insights                                                 |
| Reports         | `/api/reports`         | Report data and PDF export                                         |
| Audit           | `/api/audit`           | Audit log access                                                   |

### Response Shape

Successful responses return the requested data directly:

```json
{ "id": "...", "name": "...", ... }
```

Or, for lists:

```json
{
  "items": [ ... ],
  "nextCursor": "...",
  "total": 123
}
```

### Error Shape

```json
{
  "statusCode": 422,
  "code": "VALIDATION_FAILED",
  "message": "Field 'amount' must be positive",
  "field": "amount"
}
```

Standard codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `RATE_LIMITED`, `SERVER_ERROR`, `DUPLICATE`.

### Pagination

Cursor-based. Requests accept `?cursor=...&limit=50`. Responses include `nextCursor`.

Maximum page size: 200. Default: 50.

### Idempotency

Mutating endpoints accept an `Idempotency-Key` header (UUID). Repeating the same request with the same key returns the original result instead of creating a duplicate.

## External API

**Base path:** `/api/trellisflow/v1`

**Auth:** Bearer API token (`tf_...`), generated in TrellisFlow settings.

**Docs:** Public developer guide in `docs/integrations/external-api.md` (to be written when Wave 5 begins).

**Rate limit:** 1,000 requests/hour per token, burst 100.

### Endpoints

#### `POST /api/trellisflow/v1/summary`

Push a summary for an external business.

**Request:**

```json
{
  "date": "2026-10-14",
  "period": "day",
  "unit": "Farm #47",
  "income": 5000,
  "expenses": 3200,
  "transfers_in": 0,
  "transfers_out": 1000,
  "cash_balance": 12500,
  "assets_value": 48000,
  "liabilities_value": 6000,
  "currency": "KES",
  "notes": "Harvest week"
}
```

Also accepts an array for bulk:

```json
{
  "summaries": [ { ... }, { ... } ]
}
```

**Response (201):**

```json
{
  "id": "01HX...",
  "receivedAt": "2026-10-14T14:32:11Z",
  "status": "created"
}
```

**Status values:** `created` (new), `skipped` (duplicate — same container + date + unit already exists).

#### `GET /api/trellisflow/v1/business`

Verify the token and get business info.

**Response (200):**

```json
{
  "containerId": "01HY...",
  "name": "Sugarcane Farm",
  "currency": "KES",
  "status": "active",
  "connectedAt": "2026-10-14T09:00:00Z"
}
```

#### `GET /api/trellisflow/v1/summary/latest`

Read the latest summary for this business.

**Response (200):** the most recent summary object.

### Error Codes

| Status | Code              | Meaning                                  |
| ------ | ----------------- | ---------------------------------------- |
| 400    | BAD_REQUEST       | Malformed JSON                           |
| 401    | UNAUTHORIZED      | Missing or invalid token                 |
| 403    | FORBIDDEN         | Revoked token or no scope                |
| 409    | DUPLICATE         | Summary exists and cannot be overwritten |
| 422    | VALIDATION_FAILED | Fields invalid                           |
| 429    | RATE_LIMITED      | Too many requests                        |
| 500    | SERVER_ERROR      | Safe to retry                            |

### Versioning

The external API is versioned in the URL (`/v1/`). Breaking changes ship as `/v2/`, with at least a 6-month deprecation window for `/v1/`.

## Why Not tRPC?

An earlier design considered tRPC for the internal API. We rejected it because:

- tRPC only works for TypeScript-to-TypeScript communication.
- Future mobile apps (Swift, Kotlin) cannot consume tRPC.
- External integrations (any language) cannot consume tRPC.
- REST is universal and required anyway for external businesses.

Type safety is preserved via **generated REST client** from the backend's OpenAPI spec. The frontend gets autocomplete and compile-time checks — just delivered via OpenAPI instead of tRPC.

## Swagger

- Auto-generated from NestJS decorators (`@ApiTags`, `@ApiOperation`, etc.).
- Available at `/api/docs` in dev/staging.
- OpenAPI spec committed at build time for the frontend's client generation.
- Serves as the authoritative contract for the internal API.

## Rate Limits

| Endpoint group               | Limit                              |
| ---------------------------- | ---------------------------------- |
| Auth (login, signup)         | 5/15min per email, 20/15min per IP |
| Password reset request       | 3/hour per email                   |
| Email verification request   | 3/hour per user                    |
| External API (summary)       | 1,000/hour per token               |
| All other internal endpoints | 300/minute per user                |
