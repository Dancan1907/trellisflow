# 11 — Integration Strategy

## Purpose

This chapter defines how external businesses (systems running outside TrellisFlow) push financial summaries into a user's account.

## Principles

1. **Simple contract.** One POST with a fixed JSON shape.
2. **One-way push.** External sites push; TrellisFlow never pushes back (for MVP).
3. **Container-scoped tokens.** A token only writes to its own business.
4. **Rotating, revocable, hashed.** Security by default.
5. **Idempotent.** Re-sending the same summary doesn't duplicate.
6. **Versioned.** `/v1/` in the URL.
7. **Fail-safe.** External site down → TrellisFlow keeps working. TrellisFlow down → external site retries with backoff.
8. **No SDK required.** Plain HTTP + JSON.

## Lifecycle

### Phase 1 — Prepare

1. User logs into TrellisFlow.
2. Opens `/businesses/:id/settings` for an external business.
3. Clicks **Connect via API**.
4. Configures token label and expiry (default 90 days).
5. Clicks **Generate token**.
6. TrellisFlow returns the plain token **once**.

### Phase 2 — Configure External Site

1. User pastes the token into their external site's admin panel.
2. External site stores it (ideally hashed).
3. External site calls `GET /api/trellisflow/v1/business` to verify.
4. On success, connection confirmed.

### Phase 3 — Operate

1. On its schedule, the external site POSTs a summary.
2. TrellisFlow validates, stores, updates the dashboard.
3. On network failure, the external site retries with exponential backoff.

### Phase 4 — Rotate

1. TrellisFlow warns 14 days before expiry.
2. User generates a new token.
3. User updates the external site.
4. User revokes the old token.
5. Zero downtime.

### Phase 5 — Disconnect

1. User revokes the token.
2. External site receives 401 on next push.
3. Historical summaries remain in TrellisFlow.

## The API Contract (v1)

### Authentication

```
Authorization: Bearer tf_<token>
Content-Type: application/json
```

Tokens are 43-character base64url strings prefixed with `tf_`.

### Endpoint 1 — Verify Connection

```
GET /api/trellisflow/v1/business
```

Response 200:

```json
{
  "containerId": "01HY...",
  "name": "Sugarcane Farm",
  "currency": "KES",
  "status": "active",
  "connectedAt": "2026-10-14T09:00:00Z"
}
```

### Endpoint 2 — Push Summary

```
POST /api/trellisflow/v1/summary
```

Single:

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

Bulk (array):

```json
{
  "summaries": [ { ... }, { ... } ]
}
```

Response 201 (single):

```json
{
  "id": "01HX...",
  "receivedAt": "2026-10-14T14:32:11Z",
  "status": "created"
}
```

Response 201 (bulk):

```json
{
  "created": 3,
  "skipped": 0,
  "items": [
    { "date": "2026-10-12", "status": "created" },
    { "date": "2026-10-13", "status": "created" },
    { "date": "2026-10-14", "status": "created" }
  ]
}
```

**Duplicate handling:** If a summary for `(container, date, unit)` already exists, response status is `skipped`, not an error. Retries are safe.

### Endpoint 3 — Read Latest Summary

```
GET /api/trellisflow/v1/summary/latest
```

Response 200: the most recent summary for this business.

### Error Responses

All errors share the shape:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Field 'income' must be non-negative",
    "field": "income"
  }
}
```

| Status | Code              | Meaning                               |
| ------ | ----------------- | ------------------------------------- |
| 400    | BAD_REQUEST       | Malformed JSON                        |
| 401    | UNAUTHORIZED      | Missing or invalid token              |
| 403    | FORBIDDEN         | Revoked, no scope, container mismatch |
| 404    | NOT_FOUND         | Endpoint missing                      |
| 409    | DUPLICATE         | Summary exists; cannot overwrite      |
| 422    | VALIDATION_FAILED | Invalid fields                        |
| 429    | RATE_LIMITED      | Too many requests                     |
| 500    | SERVER_ERROR      | Safe to retry                         |

### Validation Rules

- `date` — ISO date, not in the future.
- `period` — one of `day`, `week`, `month`, `custom`.
- `income`, `expenses`, `transfers_in`, `transfers_out` — non-negative.
- `cash_balance`, `assets_value`, `liabilities_value` — numeric, may be 0.
- `currency` — 3-letter ISO 4217, must match the container.
- `unit` — optional, ≤ 64 chars.
- `notes` — optional, ≤ 500 chars.

### Retry Guidance

- Retry on 5xx, 429, and network errors.
- Do NOT retry on 400, 401, 403, 422.
- Suggested backoff: 1 min → 5 min → 30 min → 2 hours → give up until next cycle.
- Include an `Idempotency-Key` header (UUID) for extra safety.

## Token Rotation

- **Default expiry:** 90 days.
- **Warning window:** 14 days before expiry.
- **Multiple active tokens allowed** — enables zero-downtime rotation.
- **Revocation** is immediate; the next push returns 401.

## Rate Limiting

- 1,000 requests/hour per token.
- Burst allowed: 100.
- Response includes `Retry-After` header when exceeded.

## Versioning

- The external API is versioned in the URL (`/v1/`).
- Non-breaking changes (new optional fields) ship to v1 silently.
- Breaking changes ship as v2, with both versions running for ≥ 6 months.
- Deprecation is announced via response header (`Deprecation: true`) and email.

## What We Are Not Doing (Yet)

- **OAuth** — Bearer + rotation is sufficient.
- **Webhooks from TrellisFlow** — deferred.
- **Bidirectional sync** — TrellisFlow never writes to external sites.
- **Real-time streaming** — periodic pushes are enough.
- **SDKs** — plain HTTP is universal.
- **Custom field mapping** — the schema is fixed.
