# 13 — Backend Architecture

## Overview

The backend is a **NestJS** application. It exposes REST endpoints, orchestrates business logic, and manages persistence via **Prisma** + **PostgreSQL**.

## Layered Structure

```
┌─────────────────────────────────────────────┐
│  1. Controllers (REST)                      │
│     Route decorators, DTO validation,       │
│     guards, Swagger decorators              │
├─────────────────────────────────────────────┤
│  2. Services (business logic)               │
│     Business rules, transactions,           │
│     orchestration                           │
├─────────────────────────────────────────────┤
│  3. Repositories (data access)              │
│     Prisma wrappers, tenancy-enforced       │
├─────────────────────────────────────────────┤
│  4. Database (PostgreSQL via Prisma)        │
└─────────────────────────────────────────────┘
```

**Rule:** a layer only calls the layer below it. Controllers never touch Prisma directly. Services never write raw SQL. Repositories never contain business rules.

## Module Structure

```
apps/api/src/
├── modules/
│   ├── auth/         # Controllers, services, DTOs, strategies, guards
│   ├── users/
│   ├── containers/
│   ├── accounts/
│   ├── categories/
│   ├── transactions/
│   ├── recurring/
│   ├── investments/
│   ├── summaries/
│   ├── tokens/       # API token management
│   ├── budgets/
│   ├── goals/
│   ├── debt/
│   ├── dashboard/
│   ├── insights/
│   ├── reports/
│   └── audit/
├── common/
│   ├── guards/       # JwtAuthGuard, TenantGuard
│   ├── interceptors/ # Audit logging, response shaping
│   ├── filters/      # Exception handling
│   ├── decorators/   # @CurrentUser()
│   └── pipes/        # Validation pipe
├── jobs/             # Scheduled jobs
├── prisma/           # PrismaService + module
├── config/           # Env validation
├── app.module.ts
└── main.ts
```

Each module owns its controllers, services, repositories, and DTOs.

## Controllers

- Thin. Receive validated input, call services, shape responses.
- Use `@ApiTags`, `@ApiOperation` for Swagger.
- Use `@UseGuards(JwtAuthGuard, TenantGuard)` for authenticated routes.
- Use `@CurrentUser()` to inject the authenticated user.

## Services

- **Hold business logic.**
- Run multi-step writes in DB transactions.
- Verify ownership and rules before writing.
- Emit side effects (audit log, snapshot invalidation, insight regeneration).

## Repositories

- **Thin Prisma wrappers.**
- Always take the current user as a parameter.
- Enforce tenancy at the query layer.
- Never contain business rules.

## Background Jobs

Eight scheduled jobs:

| Job                         | Frequency            | Purpose                          |
| --------------------------- | -------------------- | -------------------------------- |
| `recurring-transactions`    | Daily 00:05 UTC      | Generate transactions from rules |
| `daily-snapshot`            | Daily 02:00 UTC      | Compute net worth snapshots      |
| `nightly-balance-recompute` | Daily 03:00 UTC      | Recompute account balances       |
| `insight-rules`             | Daily 04:00 UTC      | Generate insights                |
| `stale-summary-check`       | Daily 05:00 UTC      | Detect stale external businesses |
| `token-expiry-check`        | Daily 06:00 UTC      | Mark expired tokens, warn        |
| `snapshot-cleanup`          | Weekly Sun 03:00 UTC | Expire old insights              |
| `session-cleanup`           | Weekly Sun 03:30 UTC | Revoke expired sessions          |

**Job rules:**

- Idempotent.
- Batched (never load all users).
- Logged to `job_runs`.
- Safe to retry.
- Locked to prevent overlap.

## Side Effects (Queue)

Long-running follow-ups (snapshot recompute, insight regeneration) go through **pg-boss** (Postgres-backed queue). Debounced: multiple writes within 5 minutes trigger one recompute.

Audit logging is **inline** (same DB transaction) — never lost.

## Validation

- **class-validator** for backend DTOs.
- **Zod** shared between backend env validation and frontend forms.
- **Shared DTO types** live in `@trellisflow/shared`.

## Errors

- Services throw typed `AppError` subclasses.
- Global exception filter catches them and shapes responses.
- Unexpected errors are logged and return a generic 500.
- No stack traces or internals leaked to clients.

## Logging

- **Pino** for structured JSON logs.
- Every request logs method, path, user_id or token prefix, status, duration.
- Secrets are redacted.

## Testing

- **Unit tests** for services (mocked repositories).
- **Integration tests** with real Postgres (Testcontainers).
- **E2E tests** via Supertest against real HTTP routes.
- Details in chapter 16.

## What We Are Not Doing (Yet)

- **Microservices** — one backend app.
- **Message broker** (Kafka, RabbitMQ) — pg-boss suffices.
- **Redis** — Postgres covers sessions, queues, rate limiting.
- **CQRS / event sourcing** — overkill.
- **GraphQL** — REST + OpenAPI is our choice.
- **Separate worker process** — deferred until scale demands.
