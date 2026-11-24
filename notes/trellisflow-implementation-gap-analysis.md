# TrellisFlow — Implementation Gap Analysis

> **Document type:** Repository audit and implementation planning reference  
> **Status:** Initial source-code audit completed against the GitHub `main` branch  
> **Repository:** https://github.com/Dancan1907/trellisflow  
> **Roadmap reference:** `notes/trellisflow-master-product-intelligence-roadmap.md`  
> **Audit scope:** Repository structure, backend modules, frontend routes/components, package manifests, Prisma schema, and existing feature notes  
> **Important:** This is a static code review. It does not claim that every feature has been exercised in a running authenticated account or production environment.

---

## 1. Executive Summary

TrellisFlow already has a substantial financial-management foundation. It is not starting from zero.

The repository contains implemented modules for accounts, transactions, budgets, savings goals, debts, recurring transactions, investments/holdings, investment events, businesses, business summaries, snapshots, reports, insights, audit logs, API tokens, and external API ingestion.

However, the proposed AI layer described in `notes/wave-2.5-ai-features.md` is still a plan rather than an implementation. The current code search and application module registration show no AI module, no AI provider SDK integration, no M-Pesa parsing endpoint, no conversational AI endpoint, and no RAG retrieval implementation.

**The correct strategy is to add intelligence on top of the existing modules and services, not rebuild the financial platform.**

### Overall status

| Capability | Audit status | Evidence / explanation |
|---|---|---|
| Personal finance foundation | IMPLEMENTED IN CODE | Accounts, transactions, categories, recurring rules |
| Budgets and savings goals | IMPLEMENTED IN CODE | Budget module and goal projection logic |
| Debt management | IMPLEMENTED IN CODE | Debt plans and simulation module |
| Investment tracking | IMPLEMENTED IN CODE | Holdings, investment events and pricing providers |
| Business finance | IMPLEMENTED IN CODE | Business and summary modules, P&L-related services |
| Net-worth snapshots and reports | IMPLEMENTED IN CODE | Snapshot and reports services |
| Rule-based financial insights | IMPLEMENTED IN CODE | Existing deterministic insights engine |
| Goal completion projection | IMPLEMENTED IN CODE | Goal-specific historical projection utility |
| Business cash-runway warning | PARTIALLY IMPLEMENTED | Existing rule-based warning; not a general cash-flow forecast |
| M-Pesa SMS/receipt parsing | NOT FOUND IN IMPLEMENTATION | Present in the Wave 2.5 design note only |
| Natural-language transaction entry | NOT FOUND IN IMPLEMENTATION | Existing form-based transaction entry |
| Financial Q&A chatbot | NOT FOUND IN IMPLEMENTATION | No AI chat module or chat UI found |
| Natural-language navigation/actions | NOT FOUND IN IMPLEMENTATION | No assistant/tool-execution layer found |
| RAG documentation Q&A | NOT FOUND IN IMPLEMENTATION | No embedding/retrieval implementation or vector table found |
| AI-generated insight narration | NOT FOUND IN IMPLEMENTATION | Insights currently store deterministic titles/messages |
| General predictive cash-flow forecasting | NOT FOUND IN IMPLEMENTATION | Existing cash-flow reporting is historical |
| Receipt OCR/document intelligence | NOT FOUND IN IMPLEMENTATION | No OCR/document extraction workflow found |
| AI investment/business copilot | NOT FOUND IN IMPLEMENTATION | Existing financial data modules can support future tools, but no copilot exists |

"Not found" means no implementation was located in the inspected default-branch source. It is not a claim about untracked local files, external services, or features hidden behind an uninspected deployment.

---

## 2. Existing Foundations — Reuse These

### 2.1 Personal finance

**Status: IMPLEMENTED IN CODE**

Relevant backend files:

- `apps/api/src/modules/accounts/`
- `apps/api/src/modules/transactions/`
- `apps/api/src/modules/categories/`
- `apps/api/src/modules/recurring/`

Relevant frontend files:

- `apps/web/src/app/(app)/personal/`
- `apps/web/src/components/features/personal/`
- `apps/web/src/components/features/transactions/add-transaction-modal.tsx`

The transaction service already:
- Checks that the account belongs to the authenticated user.
- Validates category ownership.
- Creates the transaction and applies its balance effect in a database transaction.
- Writes an audit log.
- Recomputes the user's net-worth snapshot.

**Implementation implication:** Future M-Pesa parsing and conversational transaction entry should create a reviewed draft and then call the existing transaction creation path after confirmation. Do not create a second transaction persistence implementation.

### 2.2 Budgets, goals and debts

**Status: IMPLEMENTED IN CODE**

Relevant backend files:

- `apps/api/src/modules/budgets/`
- `apps/api/src/modules/goals/`
- `apps/api/src/modules/goals/goal-projection.ts`
- `apps/api/src/modules/debts/`

The goal module already builds contribution history and computes a projection for a savings goal. This is a useful example of deterministic financial calculation.

**Important distinction:** A savings-goal completion projection is not the same thing as a complete predictive cash-flow forecast. The latter still needs to account for expected income, recurring obligations, planned spending, and uncertainty.

### 2.3 Recurring transactions

**Status: IMPLEMENTED IN CODE**

Relevant files:

- `apps/api/src/modules/recurring/recurring.service.ts`
- `apps/api/src/modules/recurring/recurring.controller.ts`
- `apps/web/src/app/(app)/personal/recurring/page.tsx`

The recurring service supports rule management, upcoming occurrences, and generation of due transactions.

**Implementation implication:** Forecasting should reuse recurring rules as known future obligations/inflows rather than inventing a parallel recurring-bills system.

### 2.4 Investments

**Status: IMPLEMENTED IN CODE**

Relevant backend files:

- `apps/api/src/modules/holdings/`
- `apps/api/src/modules/investment-events/`

The holdings module includes pricing providers for Alpha Vantage, CoinGecko and Finnhub, as well as pricing services and a scheduled pricing job.

Relevant frontend routes/components:

- `apps/web/src/app/(app)/investments/`
- `apps/web/src/components/features/investments/`

**Implementation implication:** Future portfolio intelligence should read existing holdings and investment events. It should not introduce a duplicate portfolio ledger.

### 2.5 Business finance

**Status: IMPLEMENTED IN CODE**

Relevant backend files:

- `apps/api/src/modules/businesses/`
- `apps/api/src/modules/summaries/`

The repository has business and summary modules, including summary correction/versioning and business reporting capabilities.

The insights engine also contains business-related checks for profit decline and low cash runway.

**Implementation implication:** A future business copilot should use these existing business services and respect the distinction between personal and business ownership.

### 2.6 Net worth, snapshots and reports

**STATUS: IMPLEMENTED IN CODE**

Relevant backend files:

- `apps/api/src/modules/snapshots/`
- `apps/api/src/modules/dashboard/`
- `apps/api/src/modules/export/`

The reports service provides historical net-worth trends, historical cash-flow totals, allocation breakdowns, and PDF net-worth statement generation.

**Important distinction:** The existing cash-flow report calculates income, expenses and net cash flow over a supplied historical date range. It is not a future cash-flow prediction engine.

### 2.7 Existing insights engine

**STATUS: IMPLEMENTED IN CODE — DETERMINISTIC, NOT GENERATIVE AI**

Relevant files:

- `apps/api/src/modules/insights/insights.service.ts`
- `apps/api/src/modules/insights/insights.controller.ts`
- `apps/api/src/modules/insights/insights.module.ts`
- `apps/api/src/modules/insights/insights-wave-5-5.spec.ts`
- `apps/web/src/components/features/dashboard/insights-widget.tsx`
- `apps/web/src/app/(app)/insights/page.tsx`

The service runs rule checks including:
- Budget overspending and near-limit warnings.
- Savings-goal achievement, milestones and behind-schedule warnings.
- Debt completion.
- API token expiry.
- Net-worth milestones.
- Unusual spending against a three-month average.
- Optimization opportunities.
- Portfolio rebalance suggestions.
- Business profit decline.
- Low business cash runway.

The controller exposes authenticated endpoints to list, generate and dismiss insights. User identity is taken from the authenticated request.

The current insight model contains a title, message, severity, metadata and related entity information. The inspected schema/service does not show an AI narrative field or an LLM narration workflow.

**Implementation implication:** Preserve the existing deterministic rules as the source of truth. Add optional AI narration as a separate enhancement that explains existing insight data. The model must not invent financial figures or replace the rules engine.

---

## 3. AI Infrastructure — What Is Missing

The repository's current application module registers the existing NestJS modules but does not register an AI module.

The inspected API package manifest includes NestJS, Prisma, validation libraries and Zod, but does not include the proposed AI SDK/provider packages. The web package manifest does not include the Vercel AI SDK React integration.

Repository searches for `generateText`, `generateObject`, Anthropic SDK usage, OpenAI embedding usage, and `document_chunks` returned the Wave 2.5 planning note rather than application implementation.

No AI-specific API module, AI frontend chat component, AI endpoint, prompt directory, embedding pipeline, or RAG document-chunk model was found in the inspected source tree.

### Proposed foundation to add

1. Provider configuration and secret management.
2. A dedicated AI module in the NestJS API.
3. Strict request DTOs and structured output validation.
4. A provider abstraction so the product is not tightly coupled to one model vendor.
5. Usage limits, cost logging and feature flags.
6. Prompt/version management and tests.
7. Narrow, authenticated, user-scoped tools that call existing application services.
8. A frontend AI experience that can be introduced incrementally.

Do not add all AI infrastructure before agreeing on the first feature. Build the smallest foundation needed for M-Pesa parsing, then extend it safely.

---

## 4. Feature-by-Feature Gap Analysis

### 4.1 M-Pesa SMS and receipt parsing

**Status: NOT FOUND IN IMPLEMENTATION — FIRST AI FEATURE TO BUILD**

Existing integration point:
- `apps/api/src/modules/transactions/transactions.service.ts`
- `apps/web/src/components/features/transactions/add-transaction-modal.tsx`

Build:
1. Add an authenticated parse endpoint.
2. Accept pasted SMS/receipt text with strict length limits.
3. Extract transaction type, amount, currency, date, merchant/counterparty, phone/reference where available, and confidence.
4. Validate model output against a strict schema.
5. Show a prefilled editable transaction draft.
6. Require the user to review and confirm.
7. Save through the existing transaction service.
8. Add duplicate detection for M-Pesa reference codes where appropriate.
9. Add fixture-based tests for received money, merchant payments, paybill, till, transfers, fees, reversals, malformed messages and ambiguous dates.

Safety requirements:
- Never silently create a transaction from model output.
- Never infer a missing amount.
- Clearly mark uncertain fields.
- Do not store raw SMS content longer than necessary.
- Ensure the authenticated user owns the selected account and category.

### 4.2 Natural-language transaction entry

**Status: NOT FOUND IN IMPLEMENTATION**

Build after M-Pesa parsing:
- Parse a sentence into a transaction draft.
- Resolve the intended account and category from the user's own available data.
- Ask a clarification question when the amount, date, currency, account or transaction type is ambiguous.
- Show a confirmation preview.
- Use the existing transaction service after confirmation.

### 4.3 Transaction and financial chatbot

**Status: NOT FOUND IN IMPLEMENTATION**

The current app has no discovered chat widget or AI chat API.

Build:
- A chat interface and authenticated chat endpoint.
- Read-only query tools first: balances, transactions, spending by category, budgets, goals, recurring obligations, holdings, business summaries and insights.
- Strict user scoping on every tool.
- Deterministic server-side calculations.
- Explicit confirmation for all write actions.
- Safe navigation actions limited to known application routes.

Never let the model construct arbitrary Prisma queries or choose a user ID.

### 4.4 RAG / TrellisFlow help assistant

**Status: NOT FOUND IN IMPLEMENTATION**

The app has a static help page at `apps/web/src/app/(app)/help/page.tsx`. It is not a retrieval-augmented AI assistant.

Build only after the product documentation is reliable:
- Index selected user-facing documentation.
- Chunk by headings and preserve source metadata.
- Store embeddings in a supported vector store.
- Retrieve relevant chunks and cite the source in the answer.
- Treat retrieved text as untrusted reference content, not instructions.
- Say when documentation does not answer a question.

### 4.5 AI insights narration

**STATUS: NOT FOUND IN IMPLEMENTATION — EXISTING RULE ENGINE IS READY TO REUSE**

Build:
- Narrate an existing insight using its title, message and carefully selected supporting facts.
- Keep the original deterministic insight intact.
- Use asynchronous/background processing if narration is not immediately available.
- Cache/version generated narratives and allow regeneration.
- Avoid presenting speculative advice as a guaranteed outcome.
- Add tests ensuring the narration cannot change the underlying numeric facts.

The existing dashboard insight component already displays a title and message. It may be enhanced to show a narrative without replacing the current fallback.

### 4.6 Predictive cash flow

**STATUS: NOT FOUND AS A GENERAL FORECASTING FEATURE**

Existing pieces:
- Historical cash-flow report in `apps/api/src/modules/snapshots/reports.service.ts`.
- Recurring rules and upcoming occurrences in `apps/api/src/modules/recurring/`.
- Goal completion projection in `apps/api/src/modules/goals/goal-projection.ts`.
- Business cash-runway warning in `apps/api/src/modules/insights/insights.service.ts`.

Build:
- A deterministic baseline forecast.
- Known scheduled transactions from recurring rules.
- Expected income and known obligations, with clear confidence/assumption labels.
- Best/base/worst scenarios.
- A forecast horizon selector.
- Backtesting against actual historical outcomes.
- Warnings for projected low balances or shortfalls.

Do not call the existing historical report or goal projection a cash-flow forecast.

### 4.7 Investment and business intelligence

**STATUS: FOUNDATIONAL DATA EXISTS; ADVANCED COPILOT NOT FOUND**

Build on holdings, investment events, pricing and business summaries:
- Portfolio performance and concentration analysis.
- Explainable allocation and rebalance analysis.
- Business profitability and cash runway analysis.
- Personal/business consolidation with ownership boundaries.
- Scenario analysis with assumptions clearly separated from actual data.

---

## 5. Recommended Implementation Order

The following order minimizes duplication and builds on existing code.

### Phase 0 — Audit and prepare

- [x] Confirm GitHub repository access.
- [x] Locate the master product roadmap in `notes/`.
- [x] Inspect the backend module registration and package manifests.
- [x] Identify existing financial modules and relevant extension points.
- [ ] Run the full test, typecheck and build commands in a local/CI environment.
- [ ] Confirm production environment and deployment configuration.

### Phase 1 — M-Pesa parser (P0)

- [ ] Agree on provider/model and add secrets to deployment environment.
- [ ] Add AI module/provider configuration.
- [ ] Add parse DTO and strict extraction schema.
- [ ] Add M-Pesa parser service and authenticated endpoint.
- [ ] Add transaction-page paste/parse/review UI.
- [ ] Save only after user confirmation through the existing transaction service.
- [ ] Add fixture tests, rate limits, usage logging and failure handling.

### Phase 2 — Natural-language transaction drafts

- [ ] Add sentence-to-transaction parsing.
- [ ] Reuse account/category lookup.
- [ ] Add ambiguity handling and confirmation.
- [ ] Reuse existing transaction creation.

### Phase 3 — Read-only Money Copilot

- [ ] Add chat API and UI.
- [ ] Implement read-only tools for transactions, budgets, goals, accounts, insights and recurring rules.
- [ ] Add user-scope and authorization tests for every tool.
- [ ] Add streaming, rate limits, cost controls and error fallback.
- [ ] Evaluate answer accuracy against known test accounts.

### Phase 4 — Insights narration

- [ ] Add asynchronous narrative generation for existing insights.
- [ ] Preserve deterministic insight values.
- [ ] Add citations/links to relevant app records where useful.
- [ ] Add quality and regression tests.

### Phase 5 — Cash-flow forecasting

- [ ] Define forecast inputs and accounting rules.
- [ ] Reuse recurring rules and historical transactions.
- [ ] Implement deterministic forecast engine before adding LLM explanations.
- [ ] Add scenarios, warnings and forecast backtesting.
- [ ] Show assumptions and uncertainty in the UI.

### Phase 6 — RAG help assistant

- [ ] Finalize authoritative product documentation.
- [ ] Add document ingestion and chunking.
- [ ] Add embeddings and vector retrieval.
- [ ] Add source-cited answers and prompt-injection defenses.
- [ ] Add retrieval quality tests.

### Phase 7 — Advanced wealth and business copilot

- [ ] Portfolio performance and risk analysis.
- [ ] Business profitability and runway analysis.
- [ ] What-if simulations.
- [ ] Cross-container wealth insights without double counting.
- [ ] Controlled, explicitly confirmed write actions.

---

## 6. Architecture Rules for Every AI Feature

1. **Existing services remain the system of record.** AI tools call existing domain services; they do not duplicate persistence logic.
2. **Authentication determines identity.** Never accept a user ID from the model as authorization.
3. **Narrow tools only.** Do not expose arbitrary database queries or unrestricted application actions to an LLM.
4. **Validate every input and output.** Use DTO validation and strict schemas.
5. **Financial arithmetic is deterministic.** Use backend code for balances, totals, rates, projections and comparisons.
6. **Confirm writes.** Parsing or tool calling creates a draft; the user confirms before data changes.
7. **Keep actuals separate from projections.** Forecasts and hypothetical scenarios must never be stored or displayed as completed transactions.
8. **Explain uncertainty.** Show assumptions, confidence and missing information.
9. **Control cost and abuse.** Add per-user limits, timeouts, token budgets, usage records and feature flags.
10. **Protect financial data.** Minimize prompt context, redact secrets and avoid sending unnecessary personal data to providers.
11. **Test tenant isolation.** Every read/write tool must prove that one user cannot access another user's data.
12. **Graceful fallback.** Existing non-AI workflows must continue working if an AI provider is unavailable.

---

## 7. Files and Modules We Should Reuse

| Purpose | Existing code to extend |
|---|---|
| Save parsed transactions | `apps/api/src/modules/transactions/transactions.service.ts` |
| Transaction entry UI | `apps/web/src/components/features/transactions/add-transaction-modal.tsx` |
| Financial insights | `apps/api/src/modules/insights/insights.service.ts` |
| Insights API | `apps/api/src/modules/insights/insights.controller.ts` |
| Insights dashboard UI | `apps/web/src/components/features/dashboard/insights-widget.tsx` |
| Cash-flow history | `apps/api/src/modules/snapshots/reports.service.ts` |
| Recurring obligations | `apps/api/src/modules/recurring/recurring.service.ts` |
| Goal projections | `apps/api/src/modules/goals/goal-projection.ts` |
| Investment data | `apps/api/src/modules/holdings/` and `apps/api/src/modules/investment-events/` |
| Business data | `apps/api/src/modules/businesses/` and `apps/api/src/modules/summaries/` |
| Authenticated user context | `apps/api/src/modules/auth/` |
| Audit trail | `apps/api/src/common/services/audit.service.ts` |
| Root module registration | `apps/api/src/app.module.ts` |

---

## 8. Validation Still Required

This audit reviewed the default-branch source tree and selected implementation files. Before production changes, verify:

- Current `main` commit and deployment commit are aligned.
- CI test, typecheck and build pipelines pass.
- The authenticated product workflows behave as expected in a test account.
- Production database migrations and backup/restore procedures are healthy.
- Deployment provider environment-variable configuration is known.
- Existing M-Pesa imports or integrations are not implemented outside this repository.

No production endpoint was modified by this audit. No application code was changed.

---

## 9. Immediate Next Step

**Start with Phase 1: M-Pesa SMS parsing.**

It is the smallest high-value AI feature, directly improves the existing transaction workflow, and gives us a safe foundation for structured AI output, provider integration, validation, cost controls and user confirmation.

Before implementation, inspect the current transaction DTO/controller and account/category selection UX, then agree on the provider and deployment secrets. After that, implement the parser in small, testable commits.

---

## 10. Audit Conclusion

TrellisFlow already has the financial data model and core workflows needed to support a much smarter product. The biggest missing piece is not another finance module: it is the intelligence layer that safely interprets, explains and projects the data already in the system.

**Build the intelligence layer around the existing financial engine. Do not rebuild the engine.**
