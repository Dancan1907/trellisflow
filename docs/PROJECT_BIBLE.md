# TrellisFlow — Project Bible

> The internal reference for TrellisFlow. If you're a new contributor, read it in order. If you're returning after time away, use the table below to jump to what you need.

TrellisFlow is a personal wealth platform where employees, freelancers, and business owners can track their financial world in one place. This documentation records the project's design decisions, architecture, and implementation plan.

---

## Chapters

| #   | Chapter                                                  | What it covers                                                  |
| --- | -------------------------------------------------------- | --------------------------------------------------------------- |
| 01  | [Vision](./01-vision.md)                                 | What TrellisFlow is, in one sentence and in depth               |
| 02  | [Personas](./02-personas.md)                             | The five user types and why all five are supported              |
| 03  | [Container Model](./03-container-model.md)               | Personal, Investments, Internal Business, and External Business |
| 04  | [Core Entities](./04-entities.md)                        | Every core entity in the system                                 |
| 05  | [User Stories](./05-user-stories.md)                     | 75 stories across 11 sections                                   |
| 06  | [Feature Waves](./06-feature-waves.md)                   | The six build waves, from V0.1 to completion                    |
| 07  | [Database Schema](./07-database-schema.md)               | 22 tables across eight layers                                   |
| 08  | [API Surface](./08-api-surface.md)                       | REST controllers and Swagger documentation                      |
| 09  | [Screen Map](./09-screen-map.md)                         | Every page and route                                            |
| 10  | [Auth & Tenancy](./10-auth-and-tenancy.md)               | JWT, sessions, and multi-tenancy enforcement                    |
| 11  | [Integration Strategy](./11-integration-strategy.md)     | How external businesses connect                                 |
| 12  | [Frontend Architecture](./12-frontend-architecture.md)   | Next.js, folder structure, and components                       |
| 13  | [Backend Architecture](./13-backend-architecture.md)     | NestJS, services, repositories, and jobs                        |
| 14  | [Deployment](./14-deployment.md)                         | Vercel, Render, Neon, and CI/CD                                 |
| 15  | [Git Strategy](./15-git-strategy.md)                     | Branches, commits, and workflows                                |
| 16  | [Testing Strategy](./16-testing-strategy.md)             | Testing pyramid, tooling, and coverage targets                  |
| 17  | [Implementation Roadmap](./17-implementation-roadmap.md) | Ordered build plan, wave by wave                                |
| 18  | [Design System](./18-design-system.md)                   | Colors, typography, spacing, and visual rules                   |
| 19  | [Component Specs](./19-component-specs.md)               | Visual reference for every UI component                         |
| —   | [Runbook](./runbook.md)                                  | Recovery procedures and common fixes                            |

---

## How to Use This Bible

- **New contributor:** Read chapters 01–03 for context, then 12–13 for architecture, and finally 17 to understand what to build next.
- **Returning developer:** Review chapters 06 (Feature Waves) and 17 (Implementation Roadmap) to identify the current stage of development.
- **Reviewing a decision:** Each chapter explains what was decided and why. If you disagree with the reasoning, propose a revision instead of silently working around the decision.
- **Building UI:** Read chapters 18 (Design System) and 19 (Component Specs). Never invent styles outside of these documents.
- **Before merging a feature:** Verify that the implementation matches the relevant chapter. If the documentation is incorrect or outdated, update it in the same pull request.

## What This Bible Is Not

- **Not marketing material.** The public README lives at the repository root.
- **Not API documentation.** Swagger documentation is available at `/api/docs` when the backend is running, provided that the endpoint is configured.
- **Not a changelog.** Use GitHub commit history and releases to review changes over time.

## Guiding Principles

These principles guide architectural decisions and future development.

1. **Money is truth.** Do not persist derived values when they can be reliably computed from authoritative records. Every cash movement must have a corresponding record.
2. **Containers are first-class.** Every account, transaction, budget, and goal belongs to exactly one container.
3. **The Portfolio observes; it never writes.** The aggregation layer reads summaries and roll-ups. It does not create financial events.
4. **Soft delete by default.** Financial history is valuable. Permanent deletion must be deliberate and appropriately controlled.
5. **One user = one isolated world.** The system does not support collaboration, sharing, or cross-user data access unless this principle is explicitly revised.
6. **Append-only where truth matters.** Preserve historical records such as audit logs and financial events rather than silently overwriting them. Corrections should maintain an appropriate history.
7. **Design for all five personas, build in waves.** The data model should support all five user personas, even when their features are implemented at different stages.
8. **Testing is non-negotiable for money math and tenancy.** Financial calculations and user-data isolation require rigorous automated testing.
9. **Universal access.** Use REST APIs as the standard interface so web clients, mobile applications, external businesses, and future integrations can communicate with the platform.
10. **Boring is good.** Prefer proven, understandable, maintainable patterns over unnecessary complexity.
11. **Design before code.** Every screen must follow the Design System (ch. 18) and Component Specs (ch. 19). Never invent a new style without updating the docs first.

---

**Maintenance note:** Keep this index synchronized with the actual files in the `docs/` directory. Update chapter descriptions and links whenever documentation is added, removed, or renamed.
