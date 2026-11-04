# Wave 2 — Holdings Module Design

## Purpose

Track individual investment assets (stocks, crypto, real estate, bonds, etc.) that a user owns, along with cost basis and current value.

## Endpoints

1. GET /api/holdings — Returns all holdings, filterable
2. POST /api/holdings — Creates a new holding in a container
3. GET /api/holdings/:id — Returns one holding with recent events
4. PATCH /api/holdings/:id — Updates holding fields (name, values, notes)
5. DELETE /api/holdings/:id — Soft-deletes (sets DELETED status)
6. GET /api/holdings/summary — Aggregated totals across open holdings

## DTOs needed

### create-holding.dto.ts (all sent by user)

- containerId (UUID, required)
- name (string, 1-200 chars, required)
- assetClass (AssetClass enum, required)
- symbol (string, optional — e.g., "SCOM")
- quantity (positive number, required)
- costBasisTotal (positive number, required)
- currentValueTotal (positive number, required)
- currency (3-letter string, required)
- acquiredDate (date string, optional)
- pricingMode (PricingMode enum, optional, default MANUAL)
- notes (string, optional)

### update-holding.dto.ts (all optional)

- name
- costBasisTotal
- currentValueTotal
- acquiredDate
- notes
- (status is NOT here — it's managed by the system)

### query-holdings.dto.ts (all optional filters)

- containerId (UUID)
- assetClass (AssetClass enum)
- status (HoldingStatus enum, default OPEN)
- search (string — matches name OR symbol)

## Service methods

1. findAll(userId, query) — Returns `Holding[]` filtered by query. Includes container name for display.
2. findOne(userId, id) — Returns **one** `Holding` (with its recent events, once we build them). Throws `NotFoundException` if the holding doesn't exist or belongs to a different user.
3. create(userId, dto) — Validates the container belongs to the user. Creates the Holding. Returns the created Holding. Throws `NotFoundException` if container isn't found.
4. update(userId, id, dto) — Verifies ownership (calls `findOne` first). Updates allowed fields. Returns the updated Holding.
5. remove(userId, id) — Verifies ownership. Does a **soft delete** (sets `status: 'DELETED'` and `deletedAt: new Date()`). Returns the deleted Holding. **Not a hard delete** — we keep history for audit.
6. getSummary(userId, query) — Fetches all OPEN holdings matching the query. Computes:
   - `costBasisTotal` — sum of all holdings' cost basis
   - `currentValueTotal` — sum of all holdings' current value
   - `unrealizedGain` — computed as `currentValueTotal − costBasisTotal`
   - `count` — number of holdings
   - `currency` — from user's `reportingCurrency`
   - `byAssetClass` — breakdown by class (optional)

## Data sources

- Table: `holdings`
- Computed: unrealizedGain = currentValueTotal − costBasisTotal
- Container joined for name display

## Edge cases

- Container not owned by user → `NotFoundException('Container not found')`
- Container is not INVESTMENT type → `BadRequestException`
- quantity ≤ 0 → caught by DTO `@IsPositive()`
- Any other numeric field < 0 → caught by DTO `@Min(0)`
- Deleting an already-deleted holding → `NotFoundException`
