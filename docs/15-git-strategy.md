# 15 — Git & GitHub Strategy

## Branch Model

```
main        ← production (deploys)
develop     ← integration (all work merges here first)
feature/*   ← new features
fix/*       ← bug fixes
chore/*     ← housekeeping, deps, tooling
docs/*      ← documentation only
hotfix/*    ← emergency patches against main
```

## Branch Usage Rule

**Direct on `develop`:**

- Documentation changes.
- Config tweaks.
- Small self-contained fixes (under ~50 lines).

**Feature branch:**

- Anything touching business logic.
- Multi-file changes.
- Anything that could break if half-merged.
- Modules and substantial features.

## Workflow

```
1. Branch off develop
2. Commit with conventional commits
3. Push + open PR → develop
4. CI must pass
5. Review
6. Merge (squash for feature branches)
7. Delete branch
8. At wave end: PR develop → main, tag release
```

## Conventional Commits

Format: `<type>(<scope>): <Subject>`

**Types:** feat, fix, docs, style, refactor, perf, test, chore, ci, revert

**Rules:**

- Scope optional but lowercase.
- Subject capitalized, imperative mood, no trailing period.
- Header ≤ 100 chars.

**Examples:**

```
feat(auth): Add JWT refresh endpoint
fix(transactions): Correct transfer pairing
docs(setup): Add environment variables example
chore(deps): Bump NestJS to 10.4.15
```

**Enforcement:** commitlint via Husky `commit-msg` hook. Invalid messages are rejected.

## Pre-commit Hooks

- **Husky** runs on every commit.
- **`pre-commit`:** lint-staged formats and lints staged files.
- **`commit-msg`:** commitlint validates the message.

If either fails, the commit is rejected. Fix and retry.

## Repository Hygiene

- `.gitignore` — comprehensive; `.env*` ignored, `.env.example` allowed.
- `.gitattributes` — `* text=auto eol=lf`; binaries marked; lockfile `-merge`.
- `.editorconfig` — cross-editor consistency.
- `.nvmrc` — pins Node version.

## Secrets

- **Never committed.**
- Stored in:
  - Local: `.env.local` (gitignored).
  - GitHub Actions: repository secrets.
  - Vercel / Render: environment dashboards.

## Branch Protection

- **`main`** — protected:
  - No direct pushes.
  - PR required.
  - CI must pass.
  - At least one approval.
- **`develop`** — protected:
  - No direct pushes.
  - PR required.
  - CI must pass.

## Tags & Releases

`main` receives merges **only at major release milestones**. Waves 1–4 are internal milestones that accumulate on `develop` and do not touch `main`.

### Release Milestones

| Milestone                  | Tag               | When         |
| -------------------------- | ----------------- | ------------ |
| Wave 0 complete (scaffold) | `v0.0.1-scaffold` | After Wave 0 |
| Wave 5 complete (MVP)      | `v1.0.0`          | After Wave 5 |

After v1.0.0, subsequent releases are tagged `v1.1.0`, `v1.2.0`, etc., each merged to `main` from `develop` when ready to ship.

### Why Only Two Merges During Initial Development?

- `main` represents **released, user-facing versions**.
- Waves 1–4 are internal build phases; there is no released product yet.
- This mirrors professional GitFlow: `develop` is the integration line, `main` is the release line.

## Local Git Configuration

```bash
git config --global http.postBuffer 524288000
git config --global http.version HTTP/1.1
```

Prevents some push failures on large repos.

## Common Commands

```bash
# Daily
git status
git add <file>
git commit -m "type(scope): Subject"
git push

# Branch
git checkout -b feature/xyz
git checkout develop
git branch -d feature/xyz

# Fix mistakes
git restore <file>
git reset --soft HEAD~1
git cherry-pick <sha>
```

## Lessons Captured

- **Line ending churn** → `.gitattributes` with `eol=lf`.
- **Lockfile drift** → always `pnpm install`, commit `pnpm-lock.yaml`.
- **Wrong branch commits** → cherry-pick to the right branch.
- **Wrong path in `git add`** → always check the current directory.
- **Remote URL changes** → `git remote set-url origin <url>`.

These and other fixes live in `docs/runbook.md`.
