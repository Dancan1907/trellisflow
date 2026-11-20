# TrellisFlow External API (v1)

Push financial summaries from a business that runs on its own system into TrellisFlow.
Plain HTTP + JSON. No SDK required.

- **Base URL:** `https://<your-trellisflow-api-host>/api/v1`
- **Auth:** `Authorization: Bearer tf_live_<token>`
- **Format:** `Content-Type: application/json`
- **Interactive reference:** Swagger UI at `/docs` (non-production environments)

---

## 1. Get a token

1. In TrellisFlow, open your **external business** and choose **Connect via API**.
2. Give the token a label and (optionally) an expiry. The default expiry is **90 days**.
3. Copy the token. **It is shown once** and only a hash is stored, so TrellisFlow cannot show it again.

A token can only read and write **its own business**. You can have several active tokens
for one business, which is what makes zero-downtime rotation possible (see
[Rotating tokens](#6-rotating-tokens)).

Treat the token like a password: keep it in your server's secret store, never in client-side
code or a repository.

## 2. Verify the connection

```http
GET /api/v1/business
Authorization: Bearer tf_live_...
```

```json
{
  "id": "5b0c0b3e-...",
  "name": "Sugarcane Farm",
  "currency": "KES",
  "type": "EXTERNAL_BUSINESS",
  "createdAt": "2026-10-14T09:00:00.000Z"
}
```

## 3. Push a summary

```http
POST /api/v1/summary
Authorization: Bearer tf_live_...
Idempotency-Key: 6f1c1d52-8c1e-4f4c-9a52-6d3f2a0f9a11
Content-Type: application/json

{
  "date": "2026-11-18",
  "period": "DAY",
  "unit": "Farm #47",
  "income": 5000,
  "expenses": 3200,
  "transfersIn": 0,
  "transfersOut": 1000,
  "cashBalance": 12500,
  "assetsValue": 48000,
  "liabilitiesValue": 6000,
  "currency": "KES",
  "notes": "Harvest week"
}
```

Response `201`:

```json
{
  "id": "0c9d...",
  "containerId": "5b0c...",
  "unit": "Farm #47",
  "date": "2026-11-18",
  "period": "DAY",
  "income": 5000,
  "expenses": 3200,
  "cashBalance": 12500,
  "assetsValue": 48000,
  "liabilitiesValue": 6000,
  "netWorth": 42000,
  "currency": "KES",
  "source": "MANUAL",
  "createdAt": "2026-11-18T14:32:11.000Z"
}
```

`netWorth` is computed by TrellisFlow as `assetsValue - liabilitiesValue`.

### Fields

| Field              | Type   | Required | Rules                                                               |
| ------------------ | ------ | -------- | ------------------------------------------------------------------- |
| `date`             | string | yes      | ISO date (`YYYY-MM-DD`). Cannot be in the future.                   |
| `currency`         | string | yes      | 3-letter code. **Must match the business currency.**                |
| `cashBalance`      | number | yes      | `>= 0`                                                              |
| `assetsValue`      | number | yes      | `>= 0`                                                              |
| `liabilitiesValue` | number | yes      | `>= 0`                                                              |
| `period`           | string | no       | `DAY` (default), `WEEK`, `MONTH`, or `CUSTOM`.                      |
| `periodStart`      | string | `CUSTOM` | ISO date. Required with `period: "CUSTOM"`, must be `<= periodEnd`. |
| `periodEnd`        | string | `CUSTOM` | ISO date. Required with `period: "CUSTOM"`.                         |
| `unit`             | string | no       | Free-form label (e.g. a farm or branch), max 64 characters.         |
| `income`           | number | no       | `>= 0`, defaults to `0`.                                            |
| `expenses`         | number | no       | `>= 0`, defaults to `0`.                                            |
| `transfersIn`      | number | no       | `>= 0`, defaults to `0`.                                            |
| `transfersOut`     | number | no       | `>= 0`, defaults to `0`.                                            |
| `notes`            | string | no       | Max 500 characters.                                                 |

Unknown fields are rejected with `400`.

### One summary per date and unit

A business can hold one summary for each `(date, unit)` pair. If you send a second summary
for the same pair, TrellisFlow does **not** overwrite it and does **not** return an error:
it returns the existing summary with `"idempotent": true`. This makes naive retries safe.
To correct a value that was already recorded, edit the summary in the TrellisFlow dashboard,
which keeps a version history.

## 4. Push many summaries at once

```http
POST /api/v1/summary/bulk
Authorization: Bearer tf_live_...
Content-Type: application/json

{ "summaries": [ { "date": "2026-11-16", ... }, { "date": "2026-11-17", ... } ] }
```

- Between **1 and 100** summaries per request.
- Items are processed independently: **one bad item does not fail the batch.**
- The request returns `201` with one result per item, **in the same order you sent them**:

```json
[
  { "status": "success", "data": { "id": "...", "netWorth": 42000, "...": "..." } },
  {
    "status": "error",
    "message": "Currency must match the business currency (KES)",
    "error": "BadRequestException"
  }
]
```

Always check each item's `status`; a `201` for the request does not mean every item succeeded.

## 5. Read the latest summary

```http
GET /api/v1/summary/latest
```

Returns the most recent summary for the business, or `404` if none has been pushed yet.

## 6. Rotating tokens

Rotation is done in the TrellisFlow dashboard (or via `POST /api/businesses/:id/tokens/:tokenId/rotate`
with a dashboard login). It issues a new token and keeps the old one working for a **grace
period** (default 24 hours, maximum 7 days) so your system can switch over without downtime.
Use a grace period of `0` to revoke the old token immediately.

Recommended flow:

1. Rotate the token in TrellisFlow and copy the new token.
2. Update the token in your system.
3. Confirm it works with `GET /api/v1/business`.
4. The old token stops working on its own when the grace period ends.

### Expiry warnings

Every authenticated response includes:

| Header                   | Meaning                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `X-Token-Expires-At`     | When the token you used expires (ISO 8601).                                   |
| `X-Token-Expiry-Warning` | Only present within **14 days** of expiry, with the number of days remaining. |

Log or alert on `X-Token-Expiry-Warning` so rotation never catches you by surprise. The
TrellisFlow dashboard also flags expiring tokens.

## 7. Retries and idempotency

Networks fail. Make your pushes safe to retry:

- Send an **`Idempotency-Key`** header containing a UUID that you generate **once per logical
  push** and reuse on every retry of it.
- If a request with the same key and the same payload was already processed, TrellisFlow
  returns the **original response** and adds the header `Idempotent-Replayed: true`. Nothing is
  created twice.
- Keys are remembered for **24 hours** and are scoped to the token that used them.
- The same key with a **different** payload returns `422`.
- The same key while the first request is **still running** returns `409`: wait a moment and retry.
- **Failed requests are not remembered.** If you get a `4xx`/`5xx`, fix the problem and retry with
  the same key.
- The header must be a valid UUID, otherwise `400`.

The header is optional. Without it, the `(date, unit)` rule in [section 3](#one-summary-per-date-and-unit)
still prevents duplicates.

### When to retry

| Status                     | Retry?                                       |
| -------------------------- | -------------------------------------------- |
| `5xx`, network             | Yes, with backoff (1 min, 5 min, 30 min).    |
| `429`                      | Yes, after the `Retry-After` seconds.        |
| `409`                      | Yes, shortly (a duplicate key is in flight). |
| `400`, `401`, `404`, `422` | No. Fix the request or the token first.      |

## 8. Rate limits

- **60 requests per minute per token.**
- A per-IP backstop of 300 requests per minute applies to requests carrying an API token.

When exceeded you get `429 Too Many Requests` with a `Retry-After` header (seconds). Use the bulk
endpoint instead of many single calls when backfilling history.

## 9. Errors

Errors use a standard shape:

```json
{ "statusCode": 400, "message": ["income must not be less than 0"], "error": "Bad Request" }
```

`message` is a string or, for validation failures, an array of strings.

| Status | Meaning                                                                              |
| ------ | ------------------------------------------------------------------------------------ |
| `400`  | Invalid payload (validation, future date, currency mismatch, bad `Idempotency-Key`). |
| `401`  | Missing, malformed, unknown, revoked, or expired token.                              |
| `404`  | No summary yet (`/summary/latest`), or unknown endpoint.                             |
| `409`  | A request with the same `Idempotency-Key` is still being processed.                  |
| `422`  | The `Idempotency-Key` was already used with a different payload.                     |
| `429`  | Rate limit exceeded.                                                                 |
| `5xx`  | Server error. Safe to retry.                                                         |

## 10. Quick start

```bash
TOKEN="tf_live_xxxxxxxx"
BASE="https://your-api-host/api/v1"

# 1. Verify
curl -s "$BASE/business" -H "Authorization: Bearer $TOKEN"

# 2. Push a summary (safe to run twice)
curl -s -X POST "$BASE/summary" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-11-18",
    "currency": "KES",
    "cashBalance": 12500,
    "assetsValue": 48000,
    "liabilitiesValue": 6000,
    "income": 5000,
    "expenses": 3200
  }'
```

## Versioning

The API is versioned in the URL (`/v1/`). Breaking changes ship as `/v2/`, with at least a
6-month deprecation window for `/v1/`.
