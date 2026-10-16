# TrellisFlow

> See all your money in one place — even when it lives in many.

**TrellisFlow** is a personal wealth management platform that brings personal finances, investments, and business finances together in one dashboard. It is designed for people whose financial lives span multiple accounts, investments, and businesses — including businesses that operate on separate external systems.

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-yellow" alt="Status: In Development" />
  <img src="https://img.shields.io/badge/license-UNLICENSED-lightgrey" alt="License: UNLICENSED" />
</p>

---

## Overview

Most finance applications focus on a single aspect of financial life: budgeting, investing, or business management. In reality, these areas are interconnected.

TrellisFlow brings them together, providing a unified view of personal wealth and business performance.

The goal is simple: help users understand where their money is, how it is performing, and how their different financial activities contribute to their overall net worth.

## Core Features

- **Personal Finance Management** — Track financial accounts, transactions, budgets, and savings goals.
- **Investment Tracking** — Monitor stocks, cryptocurrency, real estate, and other investments, including realized and unrealized gains.
- **Internal Business Management** — Manage businesses directly within TrellisFlow, with financial tracking, profit and loss reporting, and runway analysis.
- **External Business Integration** — Connect businesses that operate on separate systems and send financial summaries to TrellisFlow through a REST API.
- **Unified Net Worth Tracking** — Bring personal finances, investments, and supported business financial data together to calculate an overall net worth figure.

> **Note:** TrellisFlow is under active development. Features and integrations may change as the project evolves.

## Screenshots

_Screenshots and application previews will be added as the user interface develops._

---

## Tech Stack

TrellisFlow uses a modern full-stack architecture organized as a monorepo.

| Layer           | Technology                                                  |
| --------------- | ----------------------------------------------------------- |
| Frontend        | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| Backend         | NestJS, Prisma ORM, PostgreSQL                              |
| Authentication  | JWT access and refresh tokens                               |
| Background Jobs | pg-boss (PostgreSQL-backed job queue)                       |
| Monorepo        | Turborepo, pnpm workspaces                                  |
| Deployment      | Vercel (web), Render (API), Neon (database)                 |
| CI/CD           | GitHub Actions                                              |

---

## Repository Structure

```text
trellisflow/
├── apps/
│   ├── api/                  # NestJS REST API
│   └── web/                  # Next.js frontend
├── packages/
│   └── shared/               # Shared types, enums, DTOs, and constants
├── docs/                     # Project documentation and architecture
├── .github/
│   └── workflows/            # GitHub Actions CI/CD workflows
├── package.json              # Root package configuration
├── pnpm-workspace.yaml       # pnpm workspace configuration
├── turbo.json                # Turborepo configuration
└── README.md
```

---

## Getting Started

Follow these instructions to set up TrellisFlow for local development.

### Prerequisites

Ensure the following tools are installed:

- **Node.js:** Version 20 or later, subject to project dependency compatibility.
- **pnpm:** Version 9 or later, matching the version configured in the project.
- **PostgreSQL:** Version 16 or later, or Docker for running a local database.
- **Git:** For cloning and managing the repository.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd trellisflow
```

Replace `<repository-url>` with the actual URL of your Git repository.

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create local environment files from the provided examples.

**On macOS, Linux, or Git Bash:**

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

**On Windows PowerShell:**

```powershell
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/web/.env.example apps/web/.env.local
```

Update the environment variables in both files according to the requirements documented in the corresponding `.env.example` files.

Typical configuration may include:

- PostgreSQL database connection URL
- JWT access and refresh token secrets
- API base URL for the frontend
- Other service-specific configuration

Use strong, unique secrets for local development. Never commit `.env` files containing credentials, secrets, or other sensitive information.

### 4. Set Up the Database

Ensure your PostgreSQL database is running and that the database connection URL is correctly configured.

Run the Prisma commands supported by the project to generate the database client and apply the required migrations.

For example, if the repository uses Prisma migrations:

```bash
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma migrate dev
```

These commands assume the `api` workspace is configured with the relevant Prisma scripts and schema. Follow the project's database setup documentation if the configuration differs.

### 5. Start the Applications

Start the development applications from the repository root:

```bash
pnpm dev
```

When the applications are running with the configured ports:

- **API:** http://localhost:3000
- **Web:** http://localhost:3001

The actual ports depend on the application and environment configuration.

---

## Available Commands

Run the following commands from the repository root, provided they are configured in the root `package.json`.

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Start development applications                 |
| `pnpm build`     | Build applications and packages for production |
| `pnpm lint`      | Run linting checks                             |
| `pnpm typecheck` | Run TypeScript type checks                     |
| `pnpm test`      | Run the configured test suites                 |

Individual applications may also provide additional commands. Check their respective `package.json` files for details.

---

## Architecture and Documentation

TrellisFlow is organized around a separation of concerns:

- **Web application:** Provides the user interface and financial dashboards.
- **REST API:** Handles application logic, authentication, and access to financial data.
- **Database:** Stores persistent application data using PostgreSQL and Prisma ORM.
- **Background jobs:** Uses pg-boss for supported asynchronous tasks.
- **Shared package:** Promotes consistency by centralizing reusable types, enums, DTOs, and constants.

Detailed design decisions, architecture documentation, data models, and development plans are maintained in the `docs/` directory.

Start with the **Project Bible** in `docs/` for the broader project vision and implementation guidance.

---

## Security and Financial Data

TrellisFlow is designed to bring financial information together, so security and data integrity are important considerations.

Development priorities include:

- Secure authentication and authorization.
- Protection of sensitive environment variables and credentials.
- Validation of incoming API requests.
- Appropriate access controls for personal and business financial data.
- Reliable storage and handling of financial records.
- Secure integration with external business systems.

Security controls and integrations are subject to implementation and verification as development progresses.

---

## Contributing

TrellisFlow is currently under active development.

For contribution guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md), if available in the repository.

Before contributing, review the project's documentation, follow the established coding conventions, and ensure relevant checks pass.

---

## License

TrellisFlow is currently an unlicensed, private project. All rights are reserved unless permission is expressly granted by the copyright holder.

No permission to use, copy, modify, distribute, or sublicense this software is granted by this README.

---

<p align="center">
  Built with a focus on financial clarity, thoughtful architecture, and long-term growth.
</p>
