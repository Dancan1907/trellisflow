# Wave 3 — Internal Businesses Design

## Purpose

Helps a user set up and monitor their small businesses — specifically their money movement inside TrellisFlow (accounts, transactions, P&L, net worth, runway).

## Container Type

**`INTERNAL_BUSINESS`** only for Wave 3. External businesses are Wave 4.

## Business Types

From `BusinessType` enum: `RETAIL`, `SERVICE`, `FARMING`, `FREELANCE`, `MANUFACTURING`, `OTHER`.

## Endpoints

1. **POST /api/businesses** — Creates a `Container` (type=INTERNAL_BUSINESS) + `BusinessProfile` + default categories. Returns the business with its profile attached.
2. **GET /api/businesses** — Lists all INTERNAL_BUSINESS containers for the user, each with its profile + summary (net worth).
3. **GET /api/businesses/:id** — Returns one business with profile + account list + net worth.
4. **PATCH /api/businesses/:id** — Updates `name`, `businessType`, `notes`, `logoUrl`.
5. **DELETE /api/businesses/:id** — Archives the business (soft delete: `status: 'ARCHIVED'`, `archivedAt: now()`).
6. **GET /api/businesses/:id/pnl?from=&to=** — Profit & Loss for the date range.
7. **GET /api/businesses/:id/net-worth** — Assets − Liabilities for this container.
8. **GET /api/businesses/:id/runway** — Cash runway in months (see formula below).

## Implementation Status

- **Backend:** `POST/GET/PATCH/DELETE /api/businesses`, `GET /:id/net-worth`, `GET /:id/pnl`, `GET /:id/runway` are implemented. Categories and transactions accept a `containerId` filter.
- **Frontend:** `/businesses` (list + create modal) and `/businesses/:id` (net worth, runway, P&L, accounts, transactions, archive). Dashboard business cards link to the detail page.
- **Tests:** unit (`businesses.service.spec.ts`), integration (`businesses.integration.spec.ts`), and E2E (`test/wave-3-businesses.e2e-spec.ts`).
- **Deferred:** owner's draw vs. salary, business budgets, external business summaries (Wave 4).

## P&L Structure

Request: `GET /api/businesses/:id/pnl?from=2026-01-01&to=2026-01-31`
Default range if not provided: **last 30 days**.

Response:

```json
{
  "businessId": "...",
  "currency": "KES",
  "from": "2026-01-01",
  "to": "2026-01-31",
  "totalIncome": 50000,
  "totalExpenses": 30000,
  "netProfit": 20000,
  "byCategory": [
    { "categoryId": "...", "categoryName": "Sales", "type": "INCOME", "amount": 45000 },
    { "categoryId": "...", "categoryName": "Rent", "type": "EXPENSE", "amount": 15000 },
    { "categoryId": "...", "categoryName": "Salaries", "type": "EXPENSE", "amount": 15000 }
  ]
}
```
