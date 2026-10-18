# 16 — Testing Strategy

## Testing Pyramid

```
        ▲
       ╱ ╲              E2E (Playwright)
      ╱   ╲             ~20 tests
     ╱─────╲            Slow, high confidence
    ╱       ╲
   ╱         ╲          Integration
  ╱           ╲         ~150 tests
 ╱─────────────╲        Medium speed, real DB
╱               ╲
╱                 ╲      Unit
╱                   ╲    ~600 tests
╱─────────────────────╲  Fast, isolated
```

## Priorities by Risk

### Tier 1 — Must Test

Failures here harm users:

- Net worth computation.
- P&L computation.
- Realized/unrealized gain math.
- Transfer pairing and atomicity.
- Balance recompute.
- Multi-tenancy isolation.
- Auth flows.
- Token rotation.
- Summary ingestion.
- Audit logging.

### Tier 2 — Should Test

Features users rely on daily:

- CRUD for every entity.
- Recurring rules.
- Budget progress.
- Goal progress.
- Debt projections.
- Insights generation.
- Filters and pagination.

### Tier 3 — Nice to Test

- UI components.
- Formatting.
- Empty states.
- Charts.

## Tooling

### Backend

| Purpose           | Tool                                    |
| ----------------- | --------------------------------------- |
| Test runner       | Jest                                    |
| NestJS testing    | @nestjs/testing                         |
| HTTP assertions   | Supertest                               |
| DB test container | Testcontainers (or CI Postgres service) |
| Coverage          | Jest (Istanbul)                         |

### Frontend

| Purpose           | Tool                  |
| ----------------- | --------------------- |
| Test runner       | Vitest                |
| Component testing | React Testing Library |
| DOM environment   | jsdom                 |
| API mocking       | MSW                   |

### E2E

- **Playwright** on Chromium.
- Firefox and WebKit optional.

## Unit Tests

- Test services and pure functions in isolation.
- Mock repositories and external services.
- Cover: happy path, edge cases, error cases.
- **Target: 90% coverage on services.**

## Integration Tests

- Test services + repositories + real Postgres.
- Each test runs in a transaction that rolls back.
- Cover: transactions (atomicity), tenancy, complex queries, jobs.
- **Target: 60% coverage on integration-testable code.**

## End-to-End Tests

- Test the full system through a browser.
- ~20 critical journeys:
  - Onboarding, auth, personal money flow, budgets, goals, investments, businesses, API tokens, dashboard, reports, settings, mobile viewport, error handling.
- Run in CI on Chromium.
- **E2E tests are for critical paths only**, not every feature.

## Special Tests

### Multi-Tenancy Isolation

- User A cannot read/modify/delete User B's data via any endpoint.
- External tokens cannot push to other businesses.
- Enumeration timing is uniform.
- **These run on every commit. A failure blocks merge.**

### Financial Math

- Every money computation gets at least 5 tests.
- Zero values, negatives, huge numbers, fractional amounts, order independence.
- Rounding is round-half-up; no floating-point drift.

## Test Data

- **Factories** produce valid defaults; overrides customize.
- **Fixtures** for common scenarios.
- Test databases wiped between runs.
- No shared mutable state across tests.

## Coverage Targets

| Layer                   | Target       |
| ----------------------- | ------------ |
| Services                | 90%          |
| Repositories            | 70%          |
| Controllers             | 60%          |
| Jobs                    | 80%          |
| Frontend (logic-heavy)  | 70%          |
| Frontend (display-only) | not required |
| Backend overall         | 80%          |
| Frontend overall        | 50%          |

**Coverage is a floor, not a goal.** Bad assertions with 100% coverage are worse than good assertions with 80%.

**Coverage thresholds enforced in CI.**

## CI Pipeline

Per PR:

| Step                   | Duration |
| ---------------------- | -------- |
| Lint                   | ~30s     |
| Typecheck              | ~40s     |
| Unit tests             | ~90s     |
| Integration tests      | ~3 min   |
| Build                  | ~2 min   |
| E2E (release PRs only) | ~5 min   |

Total: ~7 minutes for the standard path.

## Developer Workflow

**New feature:**

1. Write the service with unit tests.
2. Write integration tests for the DB path.
3. Write the controller.
4. Write the frontend with component tests where logic-heavy.
5. Add an E2E test if the journey is critical.
6. Open PR; CI validates.

**Bug fix:**

1. Write a failing test that reproduces the bug.
2. Fix the bug.
3. Confirm the test passes.
4. Commit both — the test is a **regression test**.

**Refactor:**

Tests are the safety net. Green before and after = safe refactor.

## What We Are Not Doing (Yet)

- Snapshot tests (noisy, low-value).
- Visual regression (later).
- Load testing (when scale demands).
- Chaos testing (overkill).
- 100% coverage (diminishing returns).
- E2E for every feature (only critical journeys).
