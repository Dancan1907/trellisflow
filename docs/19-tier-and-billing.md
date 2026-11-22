# 19 — Tier & Billing Design

> **Status:** Deferred. Not implemented in Wave 5. Planned for a future
> wave after MVP release. This document captures the design so it can be
> picked up without re-deriving the decisions.

---

## 1. Why this is deferred

Wave 5.9 was originally scoped as "Tier & Billing Structure" with four
deliverables: tier enforcement, limit checks, upgrade/downgrade screens,
and (optionally) Stripe integration.

After 5.6–5.8 shipped, we made the call to **skip 5.9 for MVP** because:

1. **Testing coverage matters more right now.** A half-implemented billing
   layer is worse than no billing layer — it introduces 403s at unexpected
   moments, requires Stripe webhooks that are hard to test locally, and
   adds a product decision surface (what limits?) that hasn't been
   validated with real users yet.
2. **Stripe needs a separate, focused PR.** Checkout + Customer Portal +
   webhooks is a self-contained 2–3 day effort. Bundling it into Wave 5
   dilutes review quality and blocks the wave on product decisions.
3. **The schema is ready.** `UserTier` (`FREE | PAID`) already exists on
   `User`. Nothing needs to change in the database to ship 5.9 later —
   only the enforcement layer and UI are missing.

**What "deferred" means concretely:**

- No limit enforcement is active today. Every user behaves as if they are
  on an unlimited tier.
- No upgrade/downgrade UI exists. `settings/billing` does not exist.
- No Stripe integration exists.
- The `UserTier` column exists and is `FREE` by default for new signups,
  but nothing reads it yet.

---

## 2. Design — FREE vs PAID

The following is the proposed tier split. **These numbers are drafts,
not commitments.** They should be validated against real usage before
enforcement ships, and can be changed freely in `limits.config.ts` when
5.9 is implemented.

### 2.1 Resource limits

| Resource                                            | FREE                            | PAID             | Rationale                                                                                             |
| --------------------------------------------------- | ------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| **Containers** (personal + investment + businesses) | 3 total, at most 1 of each type | Unlimited        | 3 is enough for a person with one job, one portfolio, one side hustle. Multi-business owners upgrade. |
| **Accounts per container**                          | 5                               | Unlimited        | 5 covers the typical bank + mobile money + cash + card + loan stack.                                  |
| **Transactions per calendar month**                 | 500                             | Unlimited        | 500/month = ~16/day. Comfortably above casual use, below power users. Resets on the 1st.              |
| **Holdings** (investment positions)                 | 20                              | Unlimited        | 20 covers a diversified retail portfolio. Index-fund-only users never hit it.                         |
| **Budgets**                                         | 5                               | Unlimited        | 5 categories is the typical "essentials" split.                                                       |
| **Savings goals**                                   | 3                               | Unlimited        | 3 active goals is generous for a single person.                                                       |
| **Recurring rules**                                 | 10                              | Unlimited        | 10 covers salary + rent + ~8 subscriptions.                                                           |
| **Debt payoff plans**                               | 2                               | Unlimited        | Most people have 1–2 debts worth planning around.                                                     |
| **API tokens** (external business)                  | 0                               | 10 per container | API is a paid-only feature by design — it's for users automating real business integrations.          |

### 2.2 Feature gates (boolean, not numeric)

| Feature                                        | FREE         | PAID           |
| ---------------------------------------------- | ------------ | -------------- |
| **Auto-pricing** for holdings (Wave 5.7)       | ❌           | ✅             |
| **Data export** — JSON / CSV / PDF (Wave 5.10) | ❌           | ✅             |
| **External Business API** (`/v1/summary`)      | ❌           | ✅             |
| **Audit log retention**                        | 30 days      | 1 year         |
| **Net worth PDF report**                       | ✅ (1/month) | ✅ (unlimited) |
| **Insights generation**                        | ✅           | ✅             |
| **Dashboard**                                  | ✅           | ✅             |
| **All reports except export**                  | ✅           | ✅             |

### 2.3 Design principles behind these numbers

1. **FREE must be genuinely usable.** A user tracking one job, one portfolio,
   and one small business should never feel forced to upgrade. Limits are
   sized for that user, not for the median power user.
2. **Upgrade moments are structural, not accidental.** The two natural
   friction points are (a) a second business or a second portfolio, and
   (b) the first external-business API integration. Those are the "aha"
   moments where $X/month feels justified — not hitting 501 transactions
   in a busy month.
3. **Feature gates beat numeric gates where possible.** "Auto-pricing is a
   paid feature" is easier to explain than "you've used 20 of 20 holdings."
   Numeric limits are reserved for resources where a natural number exists
   (containers, accounts, goals).
4. **Nothing in FREE is unusable.** Every core flow (track money, see net
   worth, generate insights, view reports) works on FREE without limits
   that block the flow. Numeric caps are on breadth (how many), not on
   depth (how deep).

---

## 3. Architecture (when 5.9 is picked up)

### 3.1 Backend

**Single source of truth for limits:** `apps/api/src/common/limits/limits.config.ts`

    export const FREE_LIMITS = {
      containers: 3,
      accountsPerContainer: 5,
      transactionsPerMonth: 500,
      holdings: 20,
      budgets: 5,
      savingsGoals: 3,
      recurringRules: 10,
      debtPlans: 2,
      apiTokensPerContainer: 0,
      features: {
        autoPricing: false,
        dataExport: false,
        externalApi: false,
        auditRetentionDays: 30,
        netWorthPdfPerMonth: 1,
      },
    } as const;

    export const PAID_LIMITS = {
      containers: Infinity,
      accountsPerContainer: Infinity,
      transactionsPerMonth: Infinity,
      holdings: Infinity,
      budgets: Infinity,
      savingsGoals: Infinity,
      recurringRules: Infinity,
      debtPlans: Infinity,
      apiTokensPerContainer: 10,
      features: {
        autoPricing: true,
        dataExport: true,
        externalApi: true,
        auditRetentionDays: 365,
        netWorthPdfPerMonth: Infinity,
      },
    } as const;

**Enforcement — decorator + guard, not scattered service checks:**

    // common/limits/check-limit.decorator.ts
    export const CheckLimit = (resource: LimitResource) => SetMetadata(LIMIT_KEY, resource);

    // common/limits/limits.guard.ts
    @Injectable()
    export class LimitsGuard implements CanActivate {
      // Reads metadata, queries current usage, throws ForbiddenException with
      // { code: 'LIMIT_EXCEEDED', resource, limit, current } if over.
    }

Apply the decorator on write endpoints:

    // containers.controller.ts
    @Post()
    @UseGuards(LimitsGuard)
    @CheckLimit('containers')
    async create(...) { ... }

    // transactions.controller.ts
    @Post()
    @UseGuards(LimitsGuard)
    @CheckLimit('transactionsPerMonth')
    async create(...) { ... }

`LimitsService` provides:

- `getLimits(userId): Limits` — reads `User.tier`, returns the right config object
- `getUsage(userId, resource): number` — queries Prisma for current usage
- `assertCanCreate(userId, resource): void` — throws if over
- `checkFeature(userId, feature): boolean` — for boolean gates

**Usage counting for month-scoped resources:** count `Transaction` rows where
`date >= firstDayOfCurrentMonth`. No stored counters — a `COUNT(*)` on a
properly indexed table is fast enough (< 5 ms for a user with a few thousand
rows) and eliminates an entire class of cache-invalidation bugs.

**Admin endpoint for manual tier flipping** (needed even after Stripe is
wired, for support and testing):

    PATCH /api/admin/users/:id/tier
    Body: { tier: 'FREE' | 'PAID' }
    Guard: AdminGuard (checks an isAdmin flag or a hardcoded allowlist of user IDs)

Requires a small schema change: `User.isAdmin Boolean @default(false)`.
Migration is trivial and non-breaking. The alternative — hardcoding your own
UUID in the controller — is faster for MVP but worse for the long term.

### 3.2 Frontend

- **`useLimits()` hook** — fetches `GET /api/limits` (new endpoint), which
  returns `{ tier, limits, usage, features }` in one call. One round trip on
  app load, cached in TanStack Query, invalidated on any write mutation
  that could change usage.
- **`settings/billing/page.tsx`** — the tier display page:
  - Current tier badge
  - Usage bars for each numeric resource ("3 of 3 containers used")
  - Feature matrix (auto-pricing, data export, API — with lock icons)
  - "Upgrade" button (points to Stripe Checkout when wired, or a placeholder
    page before that)
- **`UpgradeBanner` component** — shows when the API returns a 403 with
  `code: 'LIMIT_EXCEEDED'`. Message: "You've reached your FREE limit for
  {resource}. Upgrade to PAID to continue." with an Upgrade button.
- **API error handling** — `apiFetch` in `lib/api/api-client.ts` should
  detect `LIMIT_EXCEEDED` and surface a toast + banner rather than a generic
  error. One small change to the client.

### 3.3 Stripe integration (optional, separate PR)

Split into two phases when the time comes:

**Phase 1 — Checkout + Customer Portal (recommended):**

- One product in Stripe ("TrellisFlow Pro", monthly subscription)
- `POST /api/billing/checkout-session` → returns Stripe Checkout URL
- `POST /api/webhooks/stripe` → handles `checkout.session.completed` and
  `customer.subscription.deleted` → flips `User.tier`
- "Manage subscription" button in `/settings/billing` → Stripe Customer
  Portal URL (Stripe hosts cancel/downgrade UI for free)
- No in-app downgrade flow. Stripe handles it.
- ~2–3 days of focused work, plus testing with Stripe test mode

**Phase 2 — Metered billing (do not build):**

- Per-transaction or per-API-call billing. Way more complexity than the
  product needs at this stage. Skip.

**Env keys needed for Phase 1:**

    STRIPE_SECRET_KEY=sk_...
    STRIPE_PUBLISHABLE_KEY=pk_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    STRIPE_PRICE_ID=price_...
    STRIPE_SUCCESS_URL=https://trellisflow.vercel.app/settings/billing?upgraded=true
    STRIPE_CANCEL_URL=https://trellisflow.vercel.app/settings/billing

---

## 4. Implementation checklist (when 5.9 starts)

Backend:

- ☐ `common/limits/limits.config.ts` — FREE_LIMITS / PAID_LIMITS
- ☐ `common/limits/limits.service.ts` — getLimits / getUsage / assertCanCreate / checkFeature
- ☐ `common/limits/limits.guard.ts` + `check-limit.decorator.ts`
- ☐ `common/limits/limits.controller.ts` — `GET /api/limits`
- ☐ `modules/admin/admin.controller.ts` — `PATCH /api/admin/users/:id/tier`
- ☐ `User.isAdmin` migration
- ☐ Apply `@CheckLimit` to: containers, accounts, transactions, holdings,
  budgets, goals, recurring-rules, debt-plans, api-tokens
- ☐ Apply `@RequiresFeature` to: auto-pricing toggle, data export, external
  API endpoints
- ☐ Tests — unit for `LimitsService`; E2E for boundary cases (at limit,
  over limit, at limit + tier flip)

Frontend:

- ☐ `use-limits.ts` / `use-tier.ts` hooks
- ☐ `settings/billing/page.tsx` — usage bars + feature matrix + upgrade CTA
- ☐ `UpgradeBanner` component
- ☐ API client error handling for `LIMIT_EXCEEDED`
- ☐ Wire banner + disabled states into every creation modal

Stripe (separate PR):

- ☐ `modules/billing/` — checkout session + webhook handler
- ☐ Stripe Customer Portal integration
- ☐ Env keys + Stripe dashboard setup
- ☐ Webhook tests (Stripe CLI locally, test mode in CI)

---

## 5. What "done" looks like

A FREE user can:

- Track money, investments, and up to 3 businesses without ever hitting a
  hard wall
- Understand exactly what they'd get by upgrading (billing page + feature matrix)
- Upgrade from any page in ≤ 3 clicks (Stripe Checkout)
- Downgrade without contacting support (Stripe Customer Portal)

A PAID user can:

- Do everything the FREE tier does, without limits
- Use auto-pricing, data export, and the external business API
- See 1 year of audit history

An admin (you) can:

- Flip any user's tier via a single endpoint
- See current tier distribution with a Prisma Studio query
- (Phase 2) see Stripe subscription state via webhook logs

---

## 6. Open questions for the eventual 5.9 session

These do not need answers now — record them so they don't get lost:

1. **Pricing number.** $X/month? $Y/year? Free trial? Affects Stripe setup.
2. **Regional pricing.** KES-denominated tiers for Kenyan users? Stripe
   supports multi-currency pricing per region.
3. **Student / nonprofit discount.** Stripe coupon codes solve this if yes.
4. **Migration for existing users.** Everyone currently has `tier: FREE`.
   Do existing heavy users get grandfathered onto PAID for N months? Or
   does enforcement go live for everyone on a fixed date?
5. **Limit breach behavior.** Should a 403 block the write entirely (clean,
   strict), or should it allow the write and flag the account (lenient,
   harder to undo)? Recommendation: block, and show a clear upgrade CTA.
6. **Audit retention cleanup.** Who deletes 30+ day old audit rows for FREE
   users? A cron job in the Snapshots module? Add to the deferred list under
   5.11 or a Wave 6 task.

---

## 7. References

- Prisma schema: `apps/api/prisma/schema.prisma`, `UserTier` enum
- Roadmap: `docs/17-implementation-roadmap.md`, Wave 5.9
- Related features that are gated by this design:
  - Wave 5.7 — Auto-pricing (`Holding.pricingMode`)
  - Wave 5.10 — Data Export (not yet built)
  - Wave 5.1 — External Business API (`/v1/summary`)
