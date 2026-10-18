# Contributing to TrellisFlow

Thanks for your interest in contributing to TrellisFlow. This document explains how development work is organized and the conventions followed in this repository.

## Branching Strategy

- **`main`** — Production branch. Protected and only accepts merges through pull requests.
- **`develop`** — Integration branch. Completed work is merged here before being released to production.
- **`feature/*`** — New features (e.g., `feature/auth-module`).
- **`fix/*`** — Bug fixes.
- **`chore/*`** — Maintenance, dependency updates, and tooling changes.
- **`docs/*`** — Documentation-only changes.
- **`hotfix/*`** — Emergency patches targeting `main`.

### When to Use a Branch

- **Feature branch** — Use for changes that:
  - Modify business logic.
  - Meaningfully affect multiple files.
  - Take more than a few hours.
  - Could break functionality if partially implemented.

- **Direct changes on `develop`** — May be used for:
  - Documentation changes.
  - Configuration tweaks.
  - Small, self-contained fixes (generally under 50 lines), provided repository rules permit direct pushes.

When in doubt, use a branch and open a pull request.

## Workflow

1. Create a branch from `develop`.
2. Make changes and commit them in small, logical units.
3. Push the branch to the remote repository.
4. Open a pull request targeting `develop`.
5. Ensure CI checks pass and resolve any review feedback.
6. Merge the pull request.
7. Delete the feature branch after merging.

At the end of each development cycle, merge `develop` into `main` through a pull request and create a version tag for the release.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by Commitlint.

**Format:**

```text
<type>(<scope>): <subject>
```

- **Type:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, or `revert`.
- **Scope:** The area affected, such as `auth`, `api`, `web`, or `setup`.
- **Subject:** Use imperative wording, begin with a capital letter, and do not end with a period.

**Examples:**

```text
feat(auth): Add JWT refresh endpoint
fix(transactions): Correct transfer pairing on partial rollback
docs(setup): Add environment variables example
chore(deps): Bump NestJS to 10.4.15
```

## Git Hooks

Husky runs Git hooks to help maintain code quality.

- **Pre-commit** — `lint-staged` formats and lints staged files according to the configured rules.
- **Commit-msg** — Commitlint validates the commit message against the repository's conventions.

If a hook fails, fix the reported issue before attempting the commit again.

## Testing

- **Every feature should include appropriate tests.** See [`docs/16-testing-strategy.md`](docs/16-testing-strategy.md).
- **Financial calculations and multi-tenancy** require particular attention to correctness, isolation, and edge cases.
- Run the configured test suite locally using `pnpm test`.
- CI runs the configured checks on pull requests.

Before submitting a pull request, ensure the relevant tests pass and include tests for bug fixes where appropriate.

## Code Style

- **TypeScript** — Strict mode should remain enabled.
- **Prettier** — Follow the repository's formatting configuration.
- **ESLint** — Code must satisfy the project's lint rules, checked with `pnpm lint`.

Avoid unrelated formatting changes that make code reviews harder.

## Documentation

- Update relevant files in `docs/` when architecture, design decisions, or implementation details change.
- Add appropriate Swagger/OpenAPI annotations to every new API endpoint.
- Write comments that explain **why** something is necessary rather than simply describing **what** the code does.
- Keep setup instructions and examples consistent with the current implementation.

## Asking for Help

If you have questions, encounter a problem, or want to propose an improvement, open an issue or start a discussion using the repository's available GitHub features.
