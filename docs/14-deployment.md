# 14 — Deployment & Infrastructure

## Architecture

```
┌─────────────────────┐
│   Users / Browsers  │
└─────────────────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│apps/web │ │apps/api │
│ Vercel  │ │ Render  │
└─────────┘ └─────────┘
                │
                ▼
         ┌─────────────┐
         │ PostgreSQL  │
         │   (Neon)    │
         └─────────────┘
```

## Frontend — Vercel

- **Project:** trellisflow-web
- **Framework:** Next.js (auto-detected)
- **Root directory:** `apps/web`
- **Build command:** `cd ../.. && pnpm install && pnpm turbo build --filter=web`
- **Environment variables:** set in Vercel dashboard
- **Domains:** `trellisflow.com` (production), preview URLs per PR

## Backend — Render

- **Project:** trellisflow-api
- **Runtime:** Node.js 20
- **Root directory:** `apps/api`
- **Build command:** `cd ../.. && pnpm install && pnpm turbo build --filter=api`
- **Start command:** `node apps/api/dist/main.js`
- **Health check path:** `/health`
- **Domains:** `api.trellisflow.com`

## Database — Neon

- **PostgreSQL 16+**
- **Branches:** `main` (production), `staging`, plus per-developer branches
- **Connection:** pooled for the app (`-pooler` host), direct for migrations
- **Backups:** daily (Neon) + weekly `pg_dump` to cold storage

## Environments

| Env        | Database              | URLs                                                      |
| ---------- | --------------------- | --------------------------------------------------------- |
| Local      | Docker Postgres       | `localhost:3000` / `localhost:3001`                       |
| Staging    | Neon `staging` branch | `staging.trellisflow.com` / `api-staging.trellisflow.com` |
| Production | Neon `main` branch    | `trellisflow.com` / `api.trellisflow.com`                 |

## Environment Variables

**Never commit secrets.** Every environment variable is documented in `.env.example` files:

- `.env.example` (root) — Turborepo and cross-cutting.
- `apps/api/.env.example` — API-specific.
- `apps/web/.env.example` — web-specific.

Actual values live in:

- Local: `.env.local` (gitignored).
- Vercel: environment dashboard.
- Render: environment dashboard.
- GitHub Actions: repository secrets.

**Startup validation:** both apps validate required env vars with Zod and refuse to boot if any are missing or malformed.

## CI/CD — GitHub Actions

### Workflows

**`ci.yml`** — runs on every PR and push to `main`/`develop`:

- **Lint** — ESLint across all packages.
- **Typecheck** — `tsc --noEmit` across all packages.
- **Build** — Turborepo production build.

Future additions (as features land):

- Unit tests.
- Integration tests with Postgres service container.
- E2E tests (Playwright).

**Deploy** — Vercel and Render watch `main` and auto-deploy on merge. No separate deploy workflow needed.

### Branch Strategy

- `main` — production. PR-only, CI must pass.
- `develop` — integration. PR-only, CI must pass.
- `feature/*`, `fix/*`, `chore/*`, `docs/*` — feature branches.

### Deploy Process

1. Push a branch.
2. GitHub Actions runs CI.
3. Vercel and Render create **preview deployments** for PR branches.
4. Review the preview.
5. Merge to `develop`.
6. When ready for release, merge `develop` → `main`.
7. Vercel and Render auto-deploy `main` to production.
8. Smoke test production.

## Background Jobs

- **Render Cron Jobs** trigger scheduled tasks via HTTP endpoints.
- Each job is idempotent, logs to `job_runs`, and safe to retry.
- Alternative: Upstash QStash for HTTP-based scheduling.

## Monitoring

- **Sentry** for both apps — errors, stack traces, user context.
- **UptimeRobot** pings `/health` every minute.
- **Structured logs** captured by Vercel + Render.
- Aggregation tool (Logtail, Axiom) added when needed.

## Backups

- Neon daily automatic backups.
- Weekly `pg_dump` to S3/Cloudflare R2 for cold storage.
- **Restores tested monthly** — an untested backup is not a backup.

## Cost Estimate (MVP)

| Service     | Free tier              | Realistic cost  |
| ----------- | ---------------------- | --------------- |
| Vercel      | Generous               | $0–20           |
| Render      | Free tier (spins down) | $7–25           |
| Neon        | 0.5 GB, generous       | $0–19           |
| Resend      | 3,000 emails/month     | $0              |
| Sentry      | 5,000 errors/month     | $0              |
| UptimeRobot | 50 monitors            | $0              |
| Domain      | —                      | ~$12/year       |
| **Total**   | —                      | **$0–65/month** |

## Disaster Recovery

| Scenario            | Response                                               |
| ------------------- | ------------------------------------------------------ |
| API down            | Render auto-restarts on health check failure           |
| Frontend down       | Vercel auto-heals; rollback to previous deploy         |
| Database corruption | Restore from Neon backup (point-in-time within 7 days) |
| Bad deployment      | Rollback on both platforms                             |
| Secret leaked       | Rotate immediately; force logout all users             |
| Data breach         | Notify users, rotate everything, publish post-mortem   |

**RTO:** ~15 minutes. **RPO:** ~24 hours.

## Runbook

Recovery procedures and common fixes live in `docs/runbook.md`.
