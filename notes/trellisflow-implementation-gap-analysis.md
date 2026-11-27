# TrellisFlow — Implementation Gap Closure Roadmap

> **Status:** Active implementation and verification plan  
> **Baseline:** `main` at `eb9acf96deee88254eccafa67ead7b8a0cc9c68f` (2026-11-27)  
> **Working branch:** `complete-implementation-gap-closure`  
> **Master strategy:** `notes/trellisflow-master-product-intelligence-roadmap.md`  
> **Purpose:** Close and verify the seven agreed implementation phases; record evidence and remaining limitations accurately.  
> **Important:** A module's presence is not proof of production readiness. Every completion claim requires code, test, and (where applicable) deployment evidence.

---

## 1. Scope and completion standard

This branch closes the seven-phase implementation plan below. It does **not** attempt to implement every aspirational capability in the broader master product strategy (for example tax filing, household finance, subscription discovery, or a full financial-independence planner). Those remain separate product decisions unless explicitly added to this seven-phase scope.

A task is complete only when:
1. The backend calculation/workflow is implemented and validated.
2. API authorization, tenant isolation, validation, error handling and audit requirements are tested where relevant.
3. The frontend exposes the intended workflow and safe fallbacks.
4. Unit/integration tests cover critical success, failure, boundary and retry cases.
5. Documentation and environment examples match the actual behavior.
6. Production-only checks are explicitly verified by the repository owner; code inspection alone is not production evidence.

Database target selection, migration execution, and Neon/local PostgreSQL confirmation remain the repository owner's responsibility. This work must not change database configuration or independently run migrations.

## 2. Current baseline audit

The default branch already contains implementation areas for all seven phases:

| Phase | Baseline code status | Evidence in repository | Closure assessment |
|---|---|---|---|
| 1. M-Pesa parser | Implemented | `mpesa-import`, Gemini provider, review/confirm UI, fixture and service tests | Code-level duplicate fingerprint protection exists; verify race-safe duplicate confirmation and production journey |
| 2. Natural-language transaction drafts | Implemented | `natural-language-drafts`, DTO/schema/controller/service and web hook | Verify full user-scoped matching, clarification and confirm/write safety |
| 3. Read-only Money Copilot | Implemented | `money-copilot` API/UI/data service and tests | Verify coverage, data boundaries, accuracy and safe provider failure |
| 4. AI insight narration | Implemented | `insight-narration.service.ts`, schema fields, worker and tests | Verify deterministic facts cannot be altered and worker recovery/feature flags |
| 5. Cash-flow forecasting | Implemented | deterministic engine, service/controller, engine and service tests, forecast UI/docs | Verify accounting edge cases, transfer pairs, future-dated entries, recurring catch-up and backtest interpretation |
| 6. RAG Help Assistant | Implemented | ingestion/retrieval service, vector migration/schema, integration and service tests, web widget/docs | Verify ingestion lifecycle, retrieval quality, citations, prompt injection and graceful no-result behavior |
| 7. Advanced wealth/business copilot | Implemented with defined limitations | holdings/business analysis, what-if sensitivities, consolidated wealth, preview/confirm actions and tests | Extend only material gaps in performance/risk, runway, scenario coverage and action safety |

### Corrections to the previous gap analysis

- Receipt-image duplicate detection is already implemented: uploaded receipt bytes are SHA-256 fingerprinted; parse checks the fingerprint against the user's transactions; confirmation persists it. Existing M-Pesa service tests cover detection and persistence. Do not duplicate this implementation.
- Phase 2–7 are no longer unimplemented. The older unchecked roadmap was stale.
- Phase 7 is not a complete institutional-grade portfolio risk engine. Current concentration metrics are descriptive, not volatility or market-risk measures.
- Business runway is a historical 90-day burn-rate estimate, not a guaranteed forward forecast.
- Current what-if support is intentionally bounded: personal expense reduction, internal-business revenue/expense changes, and uniform portfolio-value sensitivity.
- Confirmed Copilot writes currently cover preview/confirm income and expense transactions; this is not unrestricted write access.
- Money Copilot documentation must be checked against current code: the original read-only-only description and its old limitations are stale now that confirmed actions and what-if sensitivities exist.
- Forecasting documentation and environment examples must be checked against current implementation and flags.

## 2.1 Implementation work completed on this branch (verification pending)

The following code changes have been made on `complete-implementation-gap-closure`. They remain **unverified until the current branch's CI and local validation complete**; related checklist items below stay unchecked until evidence is available.

- **M-Pesa duplicate race handling:** transaction and transfer writers translate unique-constraint races on receipt fingerprints or M-Pesa references into explicit conflict responses. Regression coverage simulates the database uniqueness race.
- **Natural-language confirmation retries:** income/expense and paired-transfer writes accept a per-user UUID idempotency key, compare replay payloads, return the original result for matching retries, and reject key reuse with altered details. The review form reuses one key across retries.
- **Help Assistant grounding:** generated answers without a valid citation to a retrieved approved document are withheld in favor of a no-answer response.
- **Money Copilot safety and analysis:** confirmed-action endpoints now fail closed behind `AI_MONEY_COPILOT_ENABLED`; scenario percentages accept the 0–100 boundary and reject negative/out-of-range values; account, portfolio-holding, business and investment-event safety caps disclose truncation.
- **Investment event coverage:** `INTEREST` events now require a holding, create an income transaction, credit the linked account, record realized investment income, and reverse correctly if deleted. Money Copilot summarizes recorded sale gains/losses, dividends/interest, contributions and withdrawals separately by currency.
- **Business and consolidated accounting correctness:** P&L and runway exclude pending entries and calculate per currency. Business net worth is grouped by currency; top-level totals represent only the configured business currency. Internal-to-external conversion is blocked when account currencies differ from that configured currency. Net-worth snapshots now use the user's reporting currency for headline totals, preserve per-currency breakdowns, and include open investment holding values separately from linked investment-account cash. Dashboard wealth, container cards and cash flow now use reporting-currency/per-currency data rather than summing unlike currencies. The business detail UI displays additional-currency P&L, runway and net-worth values separately.
- **Documentation/configuration:** natural-language drafts default to disabled in the API environment example; Money Copilot and help documentation describe the implemented gates, currency behavior and investment event handling.

No Prisma schema or migration changes were made. The existing per-user transaction idempotency and duplicate-import unique constraints are reused. The Help Centre source document was updated; its RAG index must be re-ingested by the repository owner in the intended database environment.

## 3. Phase 1 — M-Pesa SMS and receipt parser

**Baseline status: IMPLEMENTED. Closure focus: verification and duplicate safety.**

- [x] Gemini-backed provider abstraction and structured extraction schema.
- [x] Authenticated parse and confirm endpoints.
- [x] SMS and receipt-image parsing with editable review.
- [x] No automatic transaction write during parsing.
- [x] Explicit confirmation through the existing transaction service.
- [x] Transfer drafts are not incorrectly posted as ordinary income/expense.
- [x] M-Pesa reference duplicate detection.
- [x] SHA-256 receipt-image fingerprint duplicate detection at parse and confirmation.
- [x] Receipt fingerprint is persisted only after confirmation.
- [x] Upload MIME, file size and actual image signature validation.
- [x] Usage reservation, provider usage accounting, rate limits and safe error responses.
- [ ] Prove duplicate confirmation is race-safe under concurrent requests (database uniqueness constraint plus integration test).
- [ ] Ensure duplicate detection UX clearly blocks or warns before confirmation, and handles same image/different metadata.
- [ ] Run complete API Jest suite and frontend build on this branch.
- [ ] Verify live Render API and Vercel frontend commits and complete an authenticated production end-to-end journey (owner-operated; do not claim from source inspection).

## 4. Phase 2 — Natural-language transaction drafts

**Baseline status: IMPLEMENTED. Closure focus: robust ambiguity and write safety.**

- [ ] Audit parser schema for required amount, currency, date, type, account and category ambiguity.
- [ ] Verify account/category matching is authenticated-user scoped and never guesses across containers.
- [ ] Verify clarification responses do not create persistent transactions.
- [ ] Verify preview contents exactly match the eventual write payload.
- [ ] Verify confirmation is idempotent or safely rejects repeated/concurrent confirmation.
- [ ] Test stale, expired, altered, malformed and cross-user draft identifiers.
- [ ] Test currency mismatch, invalid category, inactive account and date boundary cases.
- [ ] Confirm all writes use the existing transaction service, balance update and audit log.
- [ ] Verify UI supports edit/cancel/confirm and clearly presents unresolved fields.
- [ ] Update documentation with actual supported language patterns and limitations.

## 5. Phase 3 — Read-only Money Copilot

**Baseline status: IMPLEMENTED. Closure focus: correctness, scope and resilience.**

- [ ] Inventory every data tool and map it to a user-scoped domain service/query.
- [ ] Test cross-user isolation for accounts, transactions, budgets, goals, holdings, businesses and snapshots.
- [ ] Verify transfers are excluded from income/expense totals and currencies are never added without conversion.
- [ ] Verify date ranges and user timezone boundaries.
- [ ] Test large data sets, truncation disclosure, missing snapshots and empty accounts.
- [ ] Verify prompts/history and transaction descriptions are treated as untrusted input.
- [ ] Verify provider failure, malformed model output, timeouts, daily quota and rate-limit behavior.
- [ ] Confirm no arbitrary SQL, write service, or model-supplied user ID is exposed.
- [ ] Validate answers against deterministic test-account ground truth.
- [ ] Update docs and API/UI labels to accurately distinguish read-only answers from the separate confirmed-action API.

## 6. Phase 4 — AI insight narration

**Baseline status: IMPLEMENTED. Closure focus: narrative factuality and job reliability.**

- [ ] Verify narration cannot change deterministic insight title, message, severity, amount, threshold or source records.
- [ ] Expand regression tests for unsupported numbers, percentages, dates, currencies and causal explanations.
- [ ] Test prompt injection in insight title/message.
- [ ] Test duplicate worker execution, concurrent claims, stale PROCESSING recovery and dismissed insights.
- [ ] Verify failed narration leaves the deterministic insight visible and retryable.
- [ ] Verify feature flags, quota accounting and usage failures do not break the insights engine.
- [ ] Confirm narrative UI has a deterministic fallback and does not imply model-generated text is a new financial fact.
- [ ] Document prompt/versioning, regeneration and operational recovery behavior.

## 7. Phase 5 — Cash-flow forecasting

**Baseline status: IMPLEMENTED. Closure focus: accounting correctness and realistic limitations.**

- [ ] Verify all money calculations, rounding and supported decimal precision.
- [ ] Verify opening-balance reconstruction for future-dated posted/reconciled transactions.
- [ ] Verify pending, posted and reconciled scheduled transactions are included exactly once.
- [ ] Verify paired transfers preserve value across same-currency accounts and never become income/expense.
- [ ] Verify recurring rule catch-up after missed occurrences, month-end clamping, leap years, intervals, end dates and custom-frequency exclusions.
- [ ] Verify generated recurring transactions are not double-counted alongside their rule.
- [ ] Verify currency mismatches and invalid/missing transfer destinations are excluded with warnings.
- [ ] Verify scenario adjustments affect only the documented variable-flow baseline.
- [ ] Verify forecast horizon/lookback validation and bounded query size.
- [ ] Verify lower/upper uncertainty bands are labeled as indicative rather than statistical guarantees.
- [ ] Verify backtesting sample count, MAE/MAPE edge cases and disclose that recurring-rule history is unavailable.
- [ ] Verify UI exposes assumptions, warnings, as-of date, currency separation and forecast horizon.
- [ ] Add integration fixtures covering realistic multi-account histories and compare engine output to hand-calculated expectations.
- [ ] Document forecast limitations, especially straight-line baseline and the lack of historical recurring-rule versions.

## 8. Phase 6 — RAG Help Assistant

**Baseline status: IMPLEMENTED. Closure focus: ingestion governance and retrieval quality.**

- [ ] Verify only approved, current product documentation is ingested.
- [ ] Verify chunking preserves document title, heading, source and safe route metadata.
- [ ] Verify re-ingestion updates/deletes stale chunks without duplicate accumulation.
- [ ] Verify embedding model and dimensions match the database vector column and index.
- [ ] Verify retrieval relevance threshold, ranking and no-result behavior using a representative evaluation set.
- [ ] Verify citations only refer to retrieved chunks actually used by the answer.
- [ ] Test prompt injection in retrieved documents, user messages and conversation history.
- [ ] Verify the assistant cannot answer personal-finance questions or invoke financial write actions.
- [ ] Verify route allowlist prevents external, protocol-relative and unsafe navigation.
- [ ] Verify user-scoped quotas, provider failure handling and usage accounting.
- [ ] Verify ingestion is repeatable and can be safely run during deployment/operations.
- [ ] Document source ownership, update process, re-indexing and retrieval evaluation.

## 9. Phase 7 — Advanced wealth and business copilot

**Baseline status: IMPLEMENTED with explicitly bounded calculations. Closure focus: expand only where data supports it.**

### Portfolio performance and risk
- [ ] Add historical portfolio valuation/performance series only if reliable price and cash-flow history exists.
- [ ] Separate contributions/withdrawals from investment return; define and document the selected return methodology.
- [ ] Add realized gain/loss and investment income only where investment-event data supports it.
- [ ] Add currency and asset-class exposure summaries without mixing currencies.
- [ ] Keep concentration metrics descriptive.
- [ ] Do not calculate volatility, beta, Sharpe ratio, drawdown or correlations without sufficient, correctly aligned historical price data; expose these as unavailable rather than fabricating estimates.
- [ ] Add tests for missing prices, stale valuations, corporate actions, deposits/withdrawals and multi-currency holdings.

### Business profitability and runway
- [ ] Verify P&L includes the correct business/container transactions and excludes transfers.
- [ ] Verify runway denominator and liquid-balance eligibility; document the 90-day lookback and zero/negative burn behavior.
- [ ] Distinguish internal transaction-level metrics from external saved-summary-only metrics.
- [ ] Add tests for no history, no cash, negative/zero burn, missing accounts and mixed currencies.
- [ ] Clearly label runway as a historical burn-rate estimate unless a separate forward forecast is implemented.

### What-if simulations
- [ ] Add typed, deterministic scenario inputs/results for supported scenario types.
- [ ] Validate percent bounds and reject unsupported or ambiguous requests rather than returning invented outputs.
- [ ] Expand only high-value scenarios supported by existing financial data (e.g. savings contribution, income shock, debt overpayment) after defining accounting assumptions.
- [ ] Ensure scenarios never persist as transactions or mutate financial records.
- [ ] Test positive/negative/zero baselines, no data, currencies, bounds and model prompt injection.

### Consolidated wealth and cross-container insights
- [ ] Verify the latest net-worth snapshot is the sole consolidated wealth total.
- [ ] Verify components are breakdowns only and are never added again to the snapshot.
- [ ] Verify personal, internal-business and external-business ownership boundaries.
- [ ] Verify snapshot staleness is disclosed and currencies are not combined without FX conversion.
- [ ] Add fixtures with overlapping account/holding/business values to prove no double counting.

### Confirmed write actions
- [ ] Verify action preview is bound to the authenticated user and immutable payload hash.
- [ ] Verify expiry, one-time confirmation, idempotency and concurrent retries.
- [ ] Verify account/category ownership and unchanged account/category details at confirmation.
- [ ] Verify transaction, balance effect, audit event and action status commit atomically.
- [ ] Verify snapshot refresh retry does not duplicate the financial write.
- [ ] Test cross-user IDs, altered payload, expired preview, deleted/inactive account, changed category, concurrency and snapshot failure.
- [ ] Document exactly which action types are supported; do not imply general-purpose write access.

## 10. Cross-cutting release gates

- [ ] API lint/typecheck/build pass.
- [ ] Web lint/typecheck/build pass.
- [ ] Full API Jest suite passes.
- [ ] Focused integration tests pass for every phase above.
- [ ] CI workflow on this branch is green.
- [ ] No unintended schema or migration changes; any required migration is reviewed separately and executed only by the repository owner.
- [ ] Environment examples and deployment docs match actual feature flags; secrets remain server-side.
- [ ] No accidental logging of SMS, receipt image, financial prompts, access tokens or provider secrets.
- [ ] Feature flags default safely and disabled features fail closed.
- [ ] Render/Vercel deployment commit and live smoke tests are confirmed by the repository owner.
- [ ] Roadmap, feature docs and release notes agree with the delivered behavior.

## 11. Explicit non-goals for this closure branch

The broader master roadmap contains additional product proposals not included in the seven implementation phases. They must not be silently treated as release blockers or marked complete here. Examples include tax preparation, household wealth sharing, financial independence planning, subscription discovery, financial obligations calendar, broad financial document intelligence, reconciliation center and full portfolio analytics requiring market-data history. These need separate product scope, data design, security review and acceptance criteria.

## 12. Completion record

For each checklist item, record the relevant commit, test command/result or production evidence in the PR description or a follow-up section. Keep unresolved items unchecked and state why they are blocked. Do not check an item based solely on a file or class existing.

**Closure objective:** finish all code-addressable requirements in Phases 1–7, prove them with automated tests and CI, update the feature documentation, and leave only owner-operated production checks or explicitly out-of-scope master-roadmap proposals.
