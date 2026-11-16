# Wave 2 Part 2 — InvestmentEvents Design

## Purpose

To record the history of investment activities (buy, sell, dividend, etc.) and calculate realized gains using the average cost basis method.

## Event Types We Support (v0.2.0)

- **BUY** — Acquiring more units of a holding (increases quantity and cost basis).
- **SELL** — Disposing of units (decreases quantity and cost basis, calculates realized gain).
- **DIVIDEND** — Cash paid out from the holding (recorded as income/realized gain, no change to quantity).
- **CONTRIBUTION** — Adding cash to the investment container (informational).
- **WITHDRAWAL** — Removing cash from the investment container (informational).

## Endpoints

1. `GET /api/investment-events` — List all investment events (filterable).
2. `POST /api/investment-events` — Create an investment event (executes the math).
3. `GET /api/investment-events/:id` — Get a specific event.
4. `DELETE /api/investment-events/:id` — Soft delete an event (and reverse its math).
5. `GET /api/holdings/:id/events` — List all events for a specific holding.

## DTOs needed

### `create-investment-event.dto.ts`

- `holdingId` (UUID, optional — required for BUY/SELL/DIVIDEND, null for CONTRIBUTION/WITHDRAWAL)
- `containerId` (UUID, required)
- `eventType` (Enum, required)
- `quantity` (Number, optional — required for BUY/SELL, null for others)
- `pricePerUnit` (Number, optional)
- `totalAmount` (Number, required)
- `currency` (String, required)
- `date` (Date string, required)
- `notes` (String, optional)

### `query-investment-events.dto.ts`

- `containerId` (UUID, optional)
- `holdingId` (UUID, optional)
- `eventType` (Enum, optional)
- `search` (String, optional — searches notes)

## Business Rules

### BUY

- **Action:** Acquiring more units.
- `Holding.quantity += dto.quantity`
- `Holding.costBasisTotal += dto.totalAmount`
- `Holding.currentValueTotal += dto.totalAmount`
- **Realized Gain:** `null` (No gain realized yet)

### SELL

- **Action:** Disposing of units. Calculates realized gain.
- **Validation:** `holding.quantity >= dto.quantity` (Reject if insufficient — 400 Bad Request).
- **Validation:** Event date must be chronologically after the last event.
- `averageCostPerShare = holding.costBasisTotal / holding.quantity`
- `costBasisToRemove = averageCostPerShare * dto.quantity`
- `Holding.quantity -= dto.quantity`
- `Holding.costBasisTotal -= costBasisToRemove`
- `Holding.currentValueTotal -= (dto.pricePerUnit * dto.quantity)`
- **Realized Gain:** `dto.totalAmount - costBasisToRemove` (Store this on the event).
- **If quantity reaches 0:** Set `holding.status = 'CLOSED'`, `holding.closedAt = now()`.

### DIVIDEND

- **Action:** Cash payout.
- `Holding.quantity` = No change.
- `Holding.costBasisTotal` = No change (Q3: We keep it simple; dividends are income, not cost basis adjustments).
- **Realized Gain:** `dto.totalAmount` (Store this on the event).

### CONTRIBUTION / WITHDRAWAL

- **Action:** Adding or removing cash to/from the container.
- `Holding` fields = No change. (These are informational events).
- **Realized Gain:** `null`

## Realized Gain Formula

When selling `N` shares at average cost `C`:
`Realized gain = (Total Sale Amount) - (N * C)`
_Where `C` = `holding.costBasisTotal / holding.quantity` (calculated BEFORE the sale)._

## Edge Cases

- **Sells more than owned:** Reject with `BadRequestException` (400). (Q1: Option A).
- **Accessing another user's data:** Reject with `NotFoundException` (404). Never leak existence.
- **Out of order events:** Reject with `BadRequestException` (400). Events must be chronological.
- **SELL on 0 quantity:** Reject with `BadRequestException` (400).
- **BUY with 0 quantity:** Reject with `BadRequestException` (400).
- **CONTRIBUTION without holding:** Allowed. `holdingId` is nullable. (Q4: Option A — it's container-level).

## Data Storage Strategy

- **Realized Gain (Q2: Option A):** Store the calculated gain on the `InvestmentEvent` at creation time. (Snapshot).
- _Why?_ If the user later deletes an earlier event, we don't want the historical realized gain of a past sale to magically change.

## Frontend

- **Event list page:** `/personal/investments/[holdingId]` (Timeline view).
- **Add event modal:** Select type, enter quantity/amount, pick date.
- **Realized gain display:** Show a "Realized Gains" summary card on the holding detail page.
