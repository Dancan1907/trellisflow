# TrellisFlow

> Connected finances. AI-assisted clarity. Better-informed decisions.

TrellisFlow is a personal wealth and business-finance platform that brings personal accounts, investments, and business finances into one place. It combines conventional financial-management workflows with deterministic financial calculations and optional AI assistance to help users understand recorded financial activity.

TrellisFlow is a private, unlicensed project. See [License](#license) before using or redistributing this repository.

---

## Contents

- [Product overview](#product-overview)
- [Feature overview](#feature-overview)
- [AI capabilities and boundaries](#ai-capabilities-and-boundaries)
- [Application access and privacy](#application-access-and-privacy)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Database setup and migrations](#database-setup-and-migrations)
- [Development commands](#development-commands)
- [Testing and quality checks](#testing-and-quality-checks)
- [Documentation](#documentation)
- [Security principles](#security-principles)
- [Contributing](#contributing)
- [License](#license)

---

## Product overview

Financial information is often spread across bank and mobile-money accounts, investment portfolios, and businesses. TrellisFlow provides a connected view while keeping the underlying financial domains and currencies distinct.

The application is organized around containers for Personal, Investments, and Businesses. Users can manage financial records, review reports, monitor net worth, and use optional AI-powered tools to ask questions or streamline supported workflows.

### Design principles

- **One connected view:** bring supported personal, investment, and business information together.
- **Clear financial boundaries:** preserve account ownership, container scope, transaction meaning, and currency distinctions.
- **Deterministic money calculations:** calculate balances, reports, forecasts, and financial metrics in application services rather than delegating arithmetic to an LLM.
- **Human confirmation:** AI-assisted transaction workflows present a review step before supported financial writes.
- **Privacy by design:** authenticate access to personal financial data and keep provider credentials on the server.
- **Explainable assistance:** ground product-help answers in approved documentation and validate their citations.

## Feature overview

The following describes implemented product areas. Availability of optional AI features depends on server configuration and feature flags.

### Personal finance

- Manage financial containers, accounts, categories, and transactions.
- Record income, expenses, and transfers.
- Review recurring transactions and their schedules.
- Track budgets, savings goals, and debt.
- Review account balances and transaction history.
- Export supported financial data and review audit history.

### Investments

- Track investment accounts and holdings across supported asset classes.
- Record investment events, including contributions, withdrawals, dividends, interest, and sales.
- Review recorded cost basis, current recorded value, and supported realized/unrealized gain information.
- Use supported market-data integrations for investment price updates.

Investment performance metrics are limited by the available recorded event and price history. A recorded valuation or gain is not a guarantee of future performance.

### Business finance

- Manage internal businesses with account and transaction-level records.
- Review business income, expenses, net worth, and profit-and-loss information.
- Review historical cash-runway estimates where sufficient data exists.
- Connect external businesses through scoped API tokens and submit financial summaries.
- Review external-business summary history and integration status.

Internal businesses and externally connected businesses have different data depth: external businesses provide the summaries submitted through the integration API.

### Wealth, reports, and insights

- Review consolidated net-worth snapshots and their component breakdowns.
- View personal, investment, and business values with currency-aware presentation.
- Analyze cash flow, allocation, and supported financial trends.
- Review deterministic insights and optional AI-generated explanations.
- Generate cash-flow projections using recorded balances, transactions, and recurring rules.

**Currency rule:** amounts in different currencies are not added together or converted unless a supported foreign-exchange conversion is explicitly implemented. Reporting currency is not itself an exchange-rate service.

### Importing and assisted entry

- Parse supported M-Pesa messages and receipt images into editable transaction drafts.
- Create transaction drafts from natural-language descriptions.
- Review extracted or proposed details before confirming a supported transaction.
- Use duplicate detection and idempotent confirmation protections where implemented.

Parsing and drafting do not themselves authorize a financial write. The user reviews and confirms the resulting transaction.

---

## AI capabilities and boundaries

TrellisFlow uses AI as an assistant around financial workflows, not as the source of truth for financial calculations.

| Capability | Purpose | Important boundary |
| --- | --- | --- |
| **M-Pesa import assistant** | Extract transaction details from supported messages and receipt images. | Produces a reviewable draft; confirmation is required before a transaction is recorded. |
| **Natural-language transaction drafts** | Turn a user's description into a structured income or expense draft. | Ambiguous details require review; supported writes use explicit confirmation and idempotency safeguards. |
| **Money Copilot** | Answer questions about the signed-in user's recorded financial information and run supported what-if sensitivities. | Financial context is user-scoped; chat analysis is read-only. A separate, constrained preview-and-confirm workflow supports income and expense creation only. |
| **AI insight narration** | Explain deterministic insights in plain language. | The rules engine remains authoritative; narration does not replace deterministic insight facts. |
| **RAG Help Assistant** | Answer product-use questions using approved TrellisFlow documentation. | Documentation-only retrieval; it does not query financial tables or execute application actions. Answers require valid citations to retrieved sources. |

### Deterministic calculations first

Financial calculations such as account balances, cash-flow forecasts, net-worth components, and investment/business metrics are computed by application services. An LLM may explain supported results, but it must not invent financial facts or independently execute arbitrary database queries.

### Provider configuration

The API supports a provider abstraction. The environment example configures Google Gemini as the primary development provider and documents OpenRouter and Anthropic as optional alternatives.

Provider API keys and embedding credentials belong in the **backend environment only**. Never place them in a `NEXT_PUBLIC_*` variable or expose them to browser code.

AI features are independently controlled by server-side flags and per-user quotas. They are disabled by default in the example environment until the owner configures credentials and validates the relevant workflow.

For implementation details and limitations, see:

- [Money Copilot](docs/money-copilot.md)
- [Help Assistant RAG architecture](docs/help-assistant-rag.md)
- [Cash-flow forecasting](docs/cash-flow-forecasting.md)
- [AI insight narration](docs/insights-narration.md)
- [AI features and privacy guide](docs/help-center/06-ai-features-and-privacy.md)

---

## Application access and privacy

TrellisFlow separates public product information from authenticated customer functionality.

### Public website

The public website is intended to explain the product, its features, pricing information, company background, and how the application works. Public examples and screenshots should use synthetic or illustrative information only.

### Signed-in application

Personal financial data and account-specific functionality belong behind authentication. This includes dashboards, transactions, balances, reports, forecasts, AI conversations, personal settings, and the in-app Help Centre.

### Internal operational information

Credentials, provider API keys, database connection strings, JWT secrets, private prompts, deployment configuration, and operational logs must not be exposed through public pages or client-side bundles.

UI visibility is not an authorization boundary. Protected API routes and server-side access checks must enforce authentication, user ownership, and permissions.

---

## Architecture

TrellisFlow is a pnpm/Turborepo monorepo with a Next.js web application, a NestJS API, and a shared TypeScript package.

```text
Browser
  |
  v
apps/web  (Next.js application)
  |
  | authenticated HTTP requests
  v
apps/api  (NestJS REST API)
  |
  +---- Prisma ORM
  |       |
  |       v
  |    PostgreSQL
  |
  +---- AI provider abstraction (server-side)
  |
  +---- Scheduled/background processing
  |
  +---- External business API

packages/shared
  |
  +---- Shared enums, types, constants
```

### Application responsibilities

- **Web application:** public marketing pages, authenticated product UI, navigation, forms, charts, and client-side data fetching.
- **API:** authentication, authorization, validation, business rules, financial calculations, AI orchestration, integrations, and audit operations.
- **PostgreSQL:** persistent user, financial, integration, and application data.
- **Prisma:** schema/client access and versioned database migrations.
- **Shared package:** reusable enums, types, DTO-related constants, and domain constants.
- **Background processing:** scheduled tasks such as supported price refreshes, snapshots, recurring workflows, and insight narration.

The API exposes Swagger/OpenAPI documentation in environments where the API documentation endpoint is enabled.

---

## Technology stack

| Area | Technology |
| --- | --- |
| Language | TypeScript |
| Web framework | Next.js 15 (App Router), React 19 |
| Styling | Tailwind CSS |
| Client state | Zustand |
| Server state | TanStack Query |
| Charts | Recharts |
| Icons | Lucide React |
| Onboarding tours | React Joyride |
| API framework | NestJS 10 |
| API validation | class-validator, class-transformer, Zod where applicable |
| Database | PostgreSQL |
| ORM and migrations | Prisma 6 |
| Authentication | JWT access/refresh tokens, Passport, Argon2id password hashing |
| AI integration | Server-side provider abstraction; Gemini configured as the primary development provider |
| Retrieval | PostgreSQL with pgvector for the Help Assistant document index |
| API documentation | NestJS Swagger / OpenAPI |
| Monorepo | pnpm workspaces, Turborepo |
| Quality and CI | ESLint, TypeScript, Prettier, Jest, GitHub Actions |

Deployment targets and provider choices are environment-specific. Configure actual deployment URLs and credentials in the relevant hosting platforms rather than committing them to the repository.

---

## Repository structure

```text
trellisflow/
├── apps/
│   ├── api/
│   │   ├── prisma/                 # Prisma schema, migrations, seed
│   │   ├── src/
│   │   │   ├── modules/            # NestJS domain and feature modules
│   │   │   ├── scripts/            # Maintenance and ingestion scripts
│   │   │   └── ...                 # API bootstrap, config, shared services
│   │   ├── test/                   # API end-to-end tests
│   │   ├── .env.example            # Backend environment template
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── app/                # Next.js routes and layouts
│       │   ├── components/         # Shared and feature UI components
│       │   ├── features/           # Feature-specific UI logic
│       │   └── lib/                # API clients, hooks, state, utilities
│       ├── public/                 # Static public assets
│       ├── .env.example            # Frontend environment template
│       └── package.json
├── packages/
│   └── shared/                     # Shared types, enums, constants
├── docs/                           # Architecture, feature, and product docs
│   ├── help-center/                # Approved product knowledge-base sources
│   └── integrations/               # External API documentation
├── notes/                          # Planning and implementation notes
├── .github/workflows/              # GitHub Actions workflows
├── package.json                    # Root scripts and tool versions
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
├── CONTRIBUTING.md
└── README.md
```

---

## Getting started

These instructions set up a local development environment. They do not select or confirm a database for you.

### Prerequisites

- **Node.js:** 20 or later.
- **pnpm:** the repository currently pins pnpm `10.30.3` in `package.json`.
- **PostgreSQL:** a compatible PostgreSQL instance. The application uses PostgreSQL-specific capabilities; the Help Assistant retrieval index also uses pgvector.
- **Git:** for cloning and branch management.

Enable Corepack where it is available, then activate the repository's pnpm version:

```bash
corepack enable
corepack prepare pnpm@10.30.3 --activate
```

Check the installed versions:

```bash
node --version
pnpm --version
```

### 1. Clone the repository

```bash
git clone https://github.com/Dancan1907/trellisflow.git
cd trellisflow
```

### 2. Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 3. Create local environment files

**macOS, Linux, or Git Bash:**

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

**Windows PowerShell:**

```powershell
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/web/.env.example apps/web/.env.local
```

Edit the files and supply values appropriate for your local environment. Do not commit either `.env.local` file.

### 4. Configure and verify your database target

Before running database commands:

1. Decide which PostgreSQL instance and database branch this local environment is intended to use.
2. Check the `DATABASE_URL` and `DIRECT_URL` values in `apps/api/.env.local`.
3. Confirm that both URLs target the intended database and that the credentials have the required permissions.
4. Keep the pooled runtime URL and direct migration URL distinct where your provider requires it.

Generate the Prisma client:

```bash
pnpm --filter @trellisflow/api exec prisma generate
```

Apply committed migrations only after you have personally verified the selected database target:

```bash
pnpm --filter @trellisflow/api exec prisma migrate deploy
```

**Important:** Do not use `prisma migrate reset` on a database containing data you need to preserve. Do not use `prisma migrate dev` as a generic deployment or shared-database setup command. Database target selection and confirmation are deliberate operator responsibilities.

### 5. Configure optional integrations

The API environment example documents optional integrations and feature flags, including:

- Resend for email delivery.
- Gemini for AI features and Help Assistant embeddings.
- OpenRouter and Anthropic as optional AI provider alternatives.
- Alpha Vantage, Finnhub, and CoinGecko for supported investment price data.

Only configure credentials for services you intend to use. Keep provider keys in the backend environment. AI capabilities remain disabled unless their corresponding feature flags are explicitly enabled and validated.

### 6. Start the application

From the repository root:

```bash
pnpm dev
```

Default local addresses:

| Service | URL |
| --- | --- |
| Web application | http://localhost:3001 |
| API | http://localhost:3000 |
| API Swagger UI | http://localhost:3000/docs (when enabled) |

The web application uses `NEXT_PUBLIC_API_URL` to reach the API. Ensure the API CORS configuration permits the local web origin.

---

## Environment configuration

The committed example files are the source of truth for the current environment variable names and defaults.

| File | Purpose |
| --- | --- |
| `apps/api/.env.example` | API server, database, JWT, email, CORS, AI providers, market-data providers, quotas, and backend feature flags. |
| `apps/web/.env.example` | Browser API URL, application URL, environment label, and public UI feature flags. |

### Important environment groups

**API**

- Server port and runtime environment.
- PostgreSQL `DATABASE_URL` and `DIRECT_URL`.
- Independent JWT access and refresh secrets and expiries.
- Email provider credentials.
- CORS allowed origins.
- AI provider/model configuration and request timeout.
- AI feature enablement and per-user daily limits.
- Investment price-provider credentials and refresh settings.

**Web**

- `NEXT_PUBLIC_API_URL` — API origin used by the web application.
- `NEXT_PUBLIC_APP_URL` — web application origin.
- `NEXT_PUBLIC_ENVIRONMENT` — environment label.
- Public feature flags controlling whether selected navigation and UI controls are displayed.

A public web flag only controls client presentation. The API's server-side feature flag and authorization checks remain authoritative.

### AI feature flags

The API example currently defaults the following features to disabled:

- `AI_MPESA_PARSE_ENABLED`
- `AI_NL_DRAFT_ENABLED`
- `AI_HELP_ASSISTANT_ENABLED`
- `AI_MONEY_COPILOT_ENABLED`
- `AI_INSIGHTS_NARRATION_ENABLED`

Each feature has a separate daily limit. The web example also contains public UI flags for selected navigation/widgets. Check both example files and the relevant feature documentation before enabling a capability.

---

## Database setup and migrations

Prisma schema and migration history are maintained under `apps/api/prisma/`.

Useful commands:

```bash
# Generate Prisma client from the current schema
pnpm --filter @trellisflow/api exec prisma generate

# Inspect migration status against the database selected in the API environment
pnpm --filter @trellisflow/api exec prisma migrate status

# Apply already-created migrations after verifying the target database
pnpm --filter @trellisflow/api exec prisma migrate deploy
```

Never commit credentials or paste production connection strings into issues, pull requests, screenshots, or chat logs.

The Help Assistant requires the pgvector extension and its document-chunk migration. After the required migrations are applied to the intended database, ingest the approved documentation:

```bash
pnpm --filter @trellisflow/api ingest:help-docs
```

Re-run ingestion when approved Help Centre source documents change. The ingestion script replaces the document index only after embedding work succeeds. See [Help Assistant RAG architecture](docs/help-assistant-rag.md).

---

## Development commands

Run commands from the repository root unless a command explicitly says otherwise.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start workspace development processes. |
| `pnpm build` | Build configured workspace packages and applications. |
| `pnpm lint` | Run configured ESLint tasks. |
| `pnpm typecheck` | Run TypeScript checks across configured workspaces. |
| `pnpm test` | Run configured Jest test tasks. |
| `pnpm test:e2e` | Run configured end-to-end test tasks. |
| `pnpm format` | Format supported source and documentation files with Prettier. |
| `pnpm format:check` | Check formatting without writing changes. |

### API-specific commands

```bash
pnpm --filter @trellisflow/api dev
pnpm --filter @trellisflow/api build
pnpm --filter @trellisflow/api typecheck
pnpm --filter @trellisflow/api test
pnpm --filter @trellisflow/api test:unit
pnpm --filter @trellisflow/api test:integration
pnpm --filter @trellisflow/api test:e2e
```

Additional API utilities:

```bash
# Evaluate the M-Pesa parser using the configured evaluation script.
pnpm --filter @trellisflow/api evaluate:mpesa

# Rebuild the Help Assistant document index after approved docs change.
pnpm --filter @trellisflow/api ingest:help-docs
```

The M-Pesa evaluation script has an explicit provider-call opt-in. Review its environment settings before running it; provider calls can consume quota or incur cost.

### Web-specific commands

```bash
pnpm --filter @trellisflow/web dev
pnpm --filter @trellisflow/web build
pnpm --filter @trellisflow/web lint
pnpm --filter @trellisflow/web typecheck
```

Generate web API types from a running API with:

```bash
pnpm --filter @trellisflow/web generate:api
```

This command reads the API OpenAPI JSON from the local API URL configured in the script.

---

## Testing and quality checks

TrellisFlow handles financial data, so correctness and tenant isolation require particular attention.

### Test layers

- **Unit tests:** validate domain services, calculations, validation rules, error handling, and feature boundaries.
- **Integration tests:** validate interactions with PostgreSQL and database constraints.
- **End-to-end tests:** validate API workflows across authentication and application modules.
- **Build and type checks:** catch compile-time and production-bundle issues.
- **Manual smoke tests:** verify the actual user experience and deployed configuration where required.

Integration and end-to-end tests require a suitable test database and correctly configured test environment. Do not point test commands at a database containing personal or production data.

### Recommended pre-PR checks

```bash
pnpm typecheck
pnpm --filter @trellisflow/api test:unit
pnpm --filter @trellisflow/api build
pnpm --filter @trellisflow/web build
git diff --check
```

Run integration and end-to-end tests when the appropriate isolated test database is configured. GitHub Actions runs the checks defined in `.github/workflows/ci.yml`.

A successful local build is not proof that production credentials, provider quotas, migrations, external integrations, or deployment settings are correct. Verify those in their intended environments.

---

## Documentation

The `docs/` directory contains the detailed product, architecture, implementation, and operational references.

### Product and architecture

- [Project Bible](docs/PROJECT_BIBLE.md)
- [Vision](docs/01-vision.md)
- [Personas](docs/02-personas.md)
- [Container model](docs/03-container-model.md)
- [Database schema](docs/07-database-schema.md)
- [API surface](docs/08-api-surface.md)
- [Authentication and tenancy](docs/10-auth-and-tenancy.md)
- [Frontend architecture](docs/12-frontend-architecture.md)
- [Backend architecture](docs/13-backend-architecture.md)
- [Deployment](docs/14-deployment.md)
- [Testing strategy](docs/16-testing-strategy.md)

### Feature documentation

- [Money Copilot](docs/money-copilot.md)
- [Help Assistant RAG architecture](docs/help-assistant-rag.md)
- [Cash-flow forecasting](docs/cash-flow-forecasting.md)
- [AI insight narration](docs/insights-narration.md)
- [External business API](docs/integrations/external-api.md)

### Help Centre source documents

The approved product guide content used by the in-app Help Assistant is maintained in [docs/help-center](docs/help-center/README.md). These Markdown documents are product knowledge sources; the authenticated Help Centre is the user-facing destination inside the application.

### Operations and contribution

- [Runbook](docs/runbook.md)
- [Contributing guide](CONTRIBUTING.md)

---

## Security principles

- Keep secrets and credentials out of source control and browser bundles.
- Store password hashes using the configured Argon2id implementation.
- Require authentication and user-scoped authorization for private financial records.
- Validate and constrain API input at the server boundary.
- Treat user text, imported messages, receipts, and retrieved documents as untrusted input.
- Apply rate limits and per-user quotas to sensitive and AI-backed endpoints.
- Use explicit review and confirmation for AI-assisted financial writes.
- Use idempotency and database constraints to protect retry-sensitive transaction operations.
- Preserve auditability for supported financial changes.
- Do not combine unlike currencies or present unsupported financial metrics as facts.
- Keep Help Assistant retrieval limited to approved product documentation; keep Money Copilot separate and scoped to the authenticated user's financial context.

Report security concerns privately to the repository owner rather than publishing exploit details or secrets in a public issue.

---

## Contributing

Development follows the repository's branch and pull-request workflow:

1. Create a feature, fix, or documentation branch from `develop`.
2. Keep changes focused and add or update tests where behavior changes.
3. Update the relevant documentation and environment examples.
4. Run applicable checks locally.
5. Open a pull request targeting `develop`.
6. Resolve review feedback and ensure required CI checks pass.
7. Merge `develop` into `main` through the release process when a release is ready.

Commit messages follow Conventional Commits. See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, Git hooks, and review expectations.

---

## License

TrellisFlow is currently a private, unlicensed project. All rights are reserved by the copyright holder.

No permission to use, copy, modify, distribute, sublicense, or create derivative works is granted by this README. Obtain express written permission from the copyright holder before using or redistributing this software.

---

<p align="center">
  Built with a focus on financial clarity, responsible AI, and long-term growth.
</p>
