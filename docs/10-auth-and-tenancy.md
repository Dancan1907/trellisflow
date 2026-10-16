# 10 — Auth & Multi-Tenancy

## Part 1 — Authentication

### Signup Flow

1. User submits email, password, name, timezone, reporting currency, persona hint, ToS acceptance.
2. Backend validates input, checks email uniqueness, hashes password with **Argon2id** (memory 19 MiB, iterations 2, parallelism 1).
3. Creates the user, auto-creates a Personal container, sends a verification email.
4. Auto-logs in (returns access + refresh tokens).

**Design decisions:**

- **Auto-login after signup** — no friction.
- **Email verification not required to use the app** — required only for sensitive actions.
- **Personal container auto-created** — dashboard never empty.

### Login Flow

1. User submits email + password + rememberMe.
2. Backend looks up user, does **timing-safe password comparison** (dummy hash when user not found).
3. Same error for wrong email and wrong password (no user enumeration).
4. On success: creates session, returns access + refresh tokens.

### Tokens

- **Access token** — JWT, short-lived (15 min), sent in `Authorization: Bearer`.
- **Refresh token** — long-lived, stored as **hashed** session record, sent via **httpOnly cookie** for web, secure storage for mobile.
- **Session lifetimes:** 7 days default, 30 days with "remember me," 90 days absolute max.

### Password Reset

- User requests → backend always returns "if this email exists, a link was sent."
- Token generated (1-hour expiry), emailed.
- Reset confirms → password updated, **all sessions revoked**, user must log in fresh.

### Sensitive Actions Requiring Verified Email

- Generating API tokens.
- Creating external businesses.
- Exporting data.
- Deleting account.
- Tier upgrades.

### Password Policy

- Minimum 8 characters, no complexity requirement (NIST guidelines).
- Compromised-password checks deferred.

## Part 2 — Authorization

### Roles

Exactly two roles:

| Role      | Who                                    | Capabilities                      |
| --------- | -------------------------------------- | --------------------------------- |
| **user**  | Every registered user                  | Full access to their own data     |
| **admin** | Platform staff (via env var allowlist) | Read-only across users, job admin |

**No business-admin role.** D3 (one user = one isolated world) forbids it.

### Enforcement

Every request that touches a resource checks:

1. Is the user authenticated?
2. Does the user own the resource?
3. Is the user verified (if required)?
4. Is the action allowed by tier limits?

Any failure → 403 with a clear message.

## Part 3 — Multi-Tenancy

### Guarantee

Every user must be able to say:

- No other user can see my data.
- No other user can modify my data.
- No other user can delete my data.
- No other user can infer anything about my data.

### Four Enforcement Layers

```
┌─────────────────────────────────────────────┐
│ Layer 4: Application (guards, services)     │
├─────────────────────────────────────────────┤
│ Layer 3: Data Access (Prisma extension)     │  ← strongest
├─────────────────────────────────────────────┤
│ Layer 2: Foreign keys + CHECK constraints   │
├─────────────────────────────────────────────┤
│ Layer 1: Schema (every table has user_id)   │
└─────────────────────────────────────────────┘
```

**Layer 1 — Schema:** Every user-owned table has a `user_id` column, even when derivable. Denormalization for safety and speed.

**Layer 2 — Constraints:** Postgres triggers reject any write where a child row's `user_id` differs from its parent's.

**Layer 3 — Prisma client extension:** Every query auto-injects `where: { user_id: ctx.user.id }`; every mutation stamps `user_id`. The current user comes from **AsyncLocalStorage** (per-request context). This makes cross-user leaks **structurally impossible** from application code.

**Layer 4 — Application:** Guards (`JwtAuthGuard`, `TenantGuard`) enforce roles and verification. Services validate business rules. Cross-table ownership is checked explicitly where the extension can't infer it.

### REST Tokens (External API)

External API tokens are **stricter than sessions**:

- Scoped to **one container** (the business they belong to).
- Limited to **summary:write** scope.
- Cannot access other containers — even ones owned by the same user.

### Failure Modes and Defenses

| Failure                            | Defense                                     |
| ---------------------------------- | ------------------------------------------- |
| Developer forgets `user_id` filter | Prisma extension auto-adds it               |
| Raw SQL bypass                     | Raw SQL banned in user-facing code          |
| Stolen session token via XSS       | httpOnly cookie                             |
| Stolen token via network           | HTTPS-only                                  |
| Stolen API token                   | Hashed at rest; rotatable                   |
| Guessed UUID                       | UUID v7 unguessable; extension still blocks |
| Enumeration via error              | Generic auth errors                         |
| Timing attack on login             | Constant-time comparison                    |
| Cross-container token access       | Token scoped to one container               |

### Testing Isolation

Automated tests on every deploy:

1. Cross-user read → 404/empty.
2. Cross-user write → 403/no-op.
3. Cross-user delete → no-op.
4. Cross-container token push → 403.
5. Prisma extension unit tests.
6. Enumeration timing.
7. Malformed token handling.

**A failure blocks the deploy.**

## Part 4 — Session Storage

- Session tokens are 32 random bytes (base64url).
- Stored as **Argon2id hashes** — never plain.
- Sent as **httpOnly, secure, sameSite=lax cookies** for web.
- Mobile apps use secure storage (Keychain/Keystore) for refresh tokens.
- `/settings/sessions` lists active sessions; user can revoke individually or all.

## Part 5 — What We Are Not Doing (Yet)

- **2FA** — deferred to a later wave.
- **OAuth** (Google, Apple) — deferred.
- **Passwordless / magic links** — deferred.
- **Device fingerprinting** — deferred.
- **Row-level security (Postgres RLS)** — Prisma extension covers it for MVP; RLS could be a second layer later.

Each can be added without breaking the current model.
