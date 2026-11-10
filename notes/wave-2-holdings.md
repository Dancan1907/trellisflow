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

---

## Service Implementation — Detailed Walkthrough

_This section captures the reasoning behind each method in `holdings.service.ts`. Read this before an interview, before refactoring, or any time you need to remember why the code looks the way it does._

### Method 1: `create(userId, dto)`

**Purpose:** Validate the container, then create a new holding.

**Flow:**

1. Fetch the container by ID **and** userId — this ensures the user owns the container. If not found, throw `NotFoundException` (404). **We use 404 not 401** so we don't leak whether the container exists for someone else.
2. Check `container.type === 'INVESTMENT'`. If not, throw `BadRequestException` (400) — this enforces the business rule that holdings only live in investment containers.
3. Create the holding with `prisma.holding.create`. We generate the ID with `randomUUID()`. We set `status: 'OPEN'` explicitly because new holdings start as open.

**Key decisions:**

- `acquiredDate` — DTO sends a string; DB expects a `Date`. We convert with `new Date(dto.acquiredDate)`. If not provided, store `null`.
- `pricingMode` — DTO might not include it; we default to `'MANUAL'` with `dto.pricingMode ?? 'MANUAL'`.

### Method 2: `findAll(userId, query)`

**Purpose:** Return all holdings for a user, with optional filters.

**Flow:**

1. Always filter `userId` (security) and `deletedAt: null` (hide soft-deleted).
2. For each optional filter, use the spread pattern: `...(condition ? { field: value } : {})`. This means: "if the user sent this filter, add it to the where clause; if not, add nothing."
3. `status` defaults to `'OPEN'` if not filtered.
4. `search` uses Prisma's `OR` with `contains` and `mode: 'insensitive'` — so searching "scom" matches "SCOM" and "Safaricom".
5. Include container name so the frontend can display "Safaricom Stock (Personal Investment)" without a second query.
6. Order by `createdAt: 'desc'` so newest holdings appear first.

**Why the spread pattern instead of just `containerId: query.containerId`?**
If `query.containerId` is `undefined`, Prisma would interpret it as `WHERE containerId = null`, returning zero rows. The spread pattern skips the filter entirely when undefined.

### Method 3: `findOne(userId, id)`

**Purpose:** Return a single holding by ID, owned by the user.

**Flow:**

1. Use `findFirst` (not `findUnique`) because we filter by `id AND userId` — `findUnique` only allows filtering by unique fields.
2. Include `deletedAt: null` so soft-deleted holdings aren't returned.
3. If nothing comes back, throw `NotFoundException('Holding not found')`.
4. Return the holding.

**Why 404 not 401:**
When User A tries to access User B's holding, `findFirst({ where: { id, userId: A } })` returns `null` because the holding belongs to B. We return 404, revealing nothing about B's holdings. If we returned 401, an attacker could probe "does this holding exist?"

### Method 4: `update(userId, id, dto)`

**Purpose:** Update specific fields on an owned holding.

**Flow:**

1. Call `findOne(userId, id)` first — this handles ownership check and throws 404 if needed.
2. Call `prisma.holding.update` with only the fields present in `UpdateHoldingDto`.

**Key decision — `undefined` vs `null`:**

- In **`create`**: `acquiredDate: dto.acquiredDate ? new Date(...) : null` — if not provided, store `null` (explicit empty).
- In **`update`**: `acquiredDate: dto.acquiredDate ? new Date(...) : undefined` — if not provided, **don't touch** the field.

**If we used `null` in `update`**, updating only the `name` would accidentally erase `acquiredDate` because `dto.acquiredDate` would be `undefined` → converted to `null` → field cleared. **`undefined` tells Prisma "skip this field."**

### Method 5: `remove(userId, id)`

**Purpose:** Soft-delete a holding (never hard delete).

**Flow:**

1. Call `findOne` first — throws 404 if not found or not owned.
2. Update the holding: set `status: 'DELETED'` and `deletedAt: new Date()`.

**Why soft delete instead of hard delete:**
Financial records must be preserved for:

- Audit trail (who deleted what, when)
- Historical reports (past net worth snapshots reference these holdings)
- Realized gains calculations (Part 2 — selling a holding requires it to still exist)

All list queries filter `deletedAt: null`, so users perceive the holding as gone. But the data lives on.

### Method 6: `getSummary(userId, query)`

**Purpose:** Aggregate statistics across open holdings for the dashboard card.

**Flow:**

1. Fetch all holdings with `status: 'OPEN'` and `deletedAt: null`, applying containerId and assetClass filters if present.
2. Sum cost basis: `holdings.reduce((sum, h) => sum + Number(h.costBasisTotal), 0)`.
3. Sum current value the same way.
4. Compute `unrealizedGain = totalCurrentValue − totalCostBasis` — **derived data, not stored**.
5. Group by asset class:
   ```typescript
   const byAssetClass = {};
   for (const h of holdings) {
     byAssetClass[h.assetClass] = (byAssetClass[h.assetClass] ?? 0) + 1;
   }
   ```
6. Return { `count, totalCostBasis, totalCurrentValue, unrealizedGain, byAssetClass` }.

Why Number() conversion is needed:
Prisma returns Decimal objects (not JS numbers) for @db.Decimal fields. sum + Decimal would throw or produce garbage. Number(decimal) converts safely.

Why unrealizedGain isn't stored in the DB:
It's a derived value. If we stored it, we'd have to update it every time currentValueTotal changed. Derived = computed on demand. Same reason we store dateOfBirth but derive age.

---

## Controller Implementation — Detailed Walkthrough

_This section captures the reasoning behind each endpoint in `holdings.controller.ts`. The controller is intentionally thin — it does routing and auth only. All logic lives in the service._

### The Setup

- **`@ApiTags('holdings')`** — Groups the 6 endpoints under "holdings" in Swagger UI.
- **`@ApiBearerAuth()`** — Tells Swagger this controller needs a JWT token, so the "Authorize" button appears.
- **`@UseGuards(JwtAuthGuard)`** — Every method requires a valid JWT. If the token is missing or invalid, NestJS returns 401 _before_ the method runs. This is why the service never has to check "is the user logged in?".
- **`@Controller('holdings')`** — Sets the base path. Combined with `app.setGlobalPrefix('api')`, all routes become `/api/holdings/*`.

### Method 1: `GET /api/holdings` — `findAll`

**Purpose:** List all holdings for the current user, with optional filters.

**Flow:**

1. `@Get()` — No path means the base route (`/api/holdings`).
2. `@CurrentUser() user` — Reads the logged-in user from the JWT (populated by `JwtAuthGuard`).
3. `@Query() query: QueryHoldingsDto` — Reads URL query params (`?containerId=X&status=OPEN`) and validates them against the DTO.
4. Calls `service.findAll(user.id, query)` and returns the result.

**Why no path in `@Get()`?** Because this is the collection root — `GET /api/holdings` returns the whole list.

### Method 2: `GET /api/holdings/summary` — `getSummary`

**Purpose:** Aggregated summary for the dashboard card.

**Flow:** Identical to `findAll` — same `@CurrentUser()`, same `@Query()`, different service method.

**Critical placement note:** This endpoint MUST come **before** `@Get(':id')`. If it came after, NestJS would interpret "summary" as a holding ID and the request would fail. Specific routes always go before wildcard routes.

### Method 3: `POST /api/holdings` — `create`

**Purpose:** Create a new holding.

**Flow:**

1. `@Post()` — No path means the base route (`/api/holdings`).
2. `@Body() dto: CreateHoldingDto` — Reads the JSON body and validates it against the DTO **before** the method runs (via the global `ValidationPipe` in `main.ts`). If validation fails, NestJS returns 400 automatically.
3. Calls `service.create(user.id, dto)`.

**Why 201 status?** `@Post()` returns 201 Created by default — correct for a resource-creating endpoint.

### Method 4: `GET /api/holdings/:id` — `findOne`

**Purpose:** Fetch one holding by ID.

**Flow:**

1. `@Get(':id')` — The `:` makes this a route parameter. Any string in that URL segment is captured as `id`.
2. `@Param('id') id: string` — Extracts the `id` segment and passes it as a string.
3. Calls `service.findOne(user.id, id)`.

**What if someone sends a non-UUID?** The string gets passed through to the service, which passes it to Prisma. Postgres rejects the query (UUID column can't compare to arbitrary string), Prisma throws `P2023`, and NestJS returns 500. This is a known limitation — the fix is to add `new ParseUUIDPipe()` to `@Param`, but it's not critical for v0.2.0.

### Method 5: `PATCH /api/holdings/:id` — `update`

**Purpose:** Partially update a holding.

**Flow:**

1. `@Patch(':id')` — Route with parameter.
2. `@Param('id') id: string` — Extracts the ID.
3. `@Body() dto: UpdateHoldingDto` — Reads and validates the body. All fields are optional (per the DTO design).
4. Calls `service.update(user.id, id, dto)`.

**Why PATCH not PUT?** `UpdateHoldingDto` allows partial updates (all fields optional). `PUT` would require the full object and would overwrite missing fields with `null`. `PATCH` only touches the fields you send.

### Method 6: `DELETE /api/holdings/:id` — `remove`

**Purpose:** Soft-delete a holding.

**Flow:**

1. `@Delete(':id')` — Route with parameter.
2. `@Param('id') id: string` — Extracts the ID.
3. Calls `service.remove(user.id, id)`.

**No `@Body()`** — DELETE requests don't typically carry a body.

**"Soft-delete" means** we set `status: 'DELETED'` and `deletedAt: now()`. The row stays in the database, but all queries filter `deletedAt: null` so users don't see it. This preserves history for audit, reports, and realized-gains calculations in Part 2.

### The Route Ordering Rule

1. `@Get()` — specific, base route

2. `@Get('summary')` — specific, static path

3. `@Post()` — different HTTP method, no conflict

4. `@Get(':id')` — wildcard, MUST come after specific GETs

5. `@Patch(':id')` — wildcard for PATCH

6. `@Delete(':id')` — wildcard for DELETE

If `@Get(':id')` came before `@Get('summary')`, then `GET /api/holdings/summary` would match the wildcard, treat "summary" as an ID, and fail with 404.
