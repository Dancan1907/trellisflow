# TrellisFlow

> See all your money in one place — even when it lives in many.

**TrellisFlow** is a premium personal wealth management platform that brings personal finances, investments, and business finances together in one unified dashboard. It is designed for people whose financial lives span multiple accounts, investments, and businesses — including businesses that operate on separate external systems.

<p align="center">
  <img src="https://img.shields.io/badge/status-MVP%20Live-brightgreen" alt="Status: Live" />
  <img src="https://img.shields.io/badge/version-v1.2.0-blue" alt="Version: 1.2.0" />
  <img src="https://img.shields.io/badge/license-UNLICENSED-lightgrey" alt="License: UNLICENSED" />
</p>

<p align="center">
  <a href="https://trellisflow.vercel.app"><strong>View Live Demo »</strong></a>
</p>

---

## Overview

Most finance applications focus on a single aspect of financial life: budgeting, investing, or business management. In reality, these areas are interconnected.

TrellisFlow brings them together, providing a unified view of personal wealth and business performance in a high-end, data-dense, and beautifully designed interface.

The goal is simple: help users understand where their money is, how it is performing, and how their different financial activities contribute to their overall net worth.

## Core Features

- **Premium UI/UX** — A Mercury-inspired warm dark mode with deep green accents, interactive charts, and smooth micro-interactions.
- **Guided Onboarding** — A built-in welcome modal, a 6-step interactive guided tour, and a comprehensive Help Center to get users up to speed immediately.
- **Personal Finance Management** — Track accounts, transactions, budgets (with rollover), savings goals, and simulate debt payoff (Snowball/Avalanche).
- **Investment Tracking** — Monitor stocks, crypto, and real estate. Includes automated **Auto-Pricing** via Alpha Vantage and realized/unrealized gain calculations.
- **Internal & External Businesses** — Manage internal businesses directly with P&L reporting and cash runway analysis, or integrate external businesses via a public REST API.
- **Automated Insights** — An engine that scans your data to alert you to unusual spending, net worth milestones, budget overruns, and optimization opportunities.
- **Data Portability & Audit** — Download your data anytime (JSON, CSV, PDF), and review every single account change via the detailed Audit Log.
- **Unified Net Worth Tracking** — A single source of truth that rolls up personal, investment, and business net worth into one number.

## Screenshots

> _Add screenshots of the Dashboard, Help Center, and Landing Page here to showcase the new premium UI._

---

## Tech Stack

TrellisFlow uses a modern full-stack architecture organized as a monorepo.

| Layer                     | Technology                                                  |
| ------------------------- | ----------------------------------------------------------- |
| **Frontend**              | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| **State & Data Fetching** | Zustand (Auth state), TanStack Query (Server state)         |
| **UI Components**         | Lucide React (Icons), React Joyride (Onboarding tours)      |
| **Backend**               | NestJS, Prisma ORM, PostgreSQL                              |
| **Authentication**        | JWT access and refresh tokens (Argon2id hashing)            |
| **Background Jobs**       | `@nestjs/schedule` (Cron jobs for Auto-Pricing & Snapshots) |
| **Monorepo**              | Turborepo, pnpm workspaces                                  |
| **Deployment**            | Vercel (Web), Render (API), Neon (Database)                 |
| **CI/CD**                 | GitHub Actions                                              |

---

## Repository Structure

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

---

## Getting Started

Follow these instructions to set up TrellisFlow for local development.

### Prerequisites

Ensure the following tools are installed:

- **Node.js:** Version 20 or later.
- **pnpm:** Version 9 or later.
- **PostgreSQL:** Version 16 or later, or Docker for running a local database.
- **Git:** For cloning and managing the repository.

### 1. Clone the Repository

    git clone https://github.com/Dancan1907/trellisflow.git
    cd trellisflow

### 2. Install Dependencies

    pnpm install

### 3. Configure Environment Variables

Create local environment files from the provided examples.

**On macOS, Linux, or Git Bash:**
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local

**On Windows PowerShell:**
Copy-Item apps/api/.env.example apps/api/.env.local
Copy-Item apps/web/.env.example apps/web/.env.local

Update the environment variables in both files according to the requirements documented in the corresponding `.env.example` files.

_Note: To enable auto-pricing for investments, you will need a free [Alpha Vantage API key](https://www.alphavantage.co/support/#api-key)._

### 4. Set Up the Database

Ensure your PostgreSQL database is running and that the database connection URL is correctly configured.

Run the Prisma commands to generate the database client and apply the required migrations:

    pnpm --filter api exec prisma generate
    pnpm --filter api exec prisma migrate dev

### 5. Start the Applications

Start the development applications from the repository root:

    pnpm dev

When the applications are running with the configured ports:

- **API:** http://localhost:3000
- **Web:** http://localhost:3001

---

## Available Commands

| Command          | Description                                    |
| ---------------- | ---------------------------------------------- |
| `pnpm dev`       | Start development applications                 |
| `pnpm build`     | Build applications and packages for production |
| `pnpm lint`      | Run linting checks                             |
| `pnpm typecheck` | Run TypeScript type checks                     |
| `pnpm test`      | Run the unit test suites                       |
| `pnpm test:e2e`  | Run the End-to-End test suites                 |

---

## Architecture and Documentation

TrellisFlow is organized around a separation of concerns:

- **Web application:** Provides the user interface and financial dashboards.
- **REST API:** Handles application logic, authentication, and access to financial data.
- **Database:** Stores persistent application data using PostgreSQL and Prisma ORM.
- **Background jobs:** Uses NestJS schedule for auto-pricing and net worth snapshots.
- **Shared package:** Promotes consistency by centralizing reusable types, enums, DTOs, and constants.

Detailed design decisions, architecture documentation, data models, and development plans are maintained in the `docs/` directory.

---

## Security and Financial Data

TrellisFlow is designed to bring financial information together, so security and data integrity are important considerations.

Development priorities include:

- Secure authentication (Argon2id) and authorization (JWT rotation).
- Multi-tenant isolation at the database query level.
- Protection of sensitive environment variables and credentials.
- Rate limiting to prevent brute-force and DDoS attacks.
- Reliable storage, immutable audit logs, and secure integration with external business systems.

---

## License

TrellisFlow is currently an unlicensed, private project. All rights are reserved unless permission is expressly granted by the copyright holder.

No permission to use, copy, modify, distribute, or sublicense this software is granted by this README.

---

<p align="center">
  Built with a focus on financial clarity, thoughtful architecture, and long-term growth.
</p>
