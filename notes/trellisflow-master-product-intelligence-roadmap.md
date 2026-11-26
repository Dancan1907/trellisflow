# TrellisFlow --- Master Product & Intelligence Roadmap

> **Document type:** Product strategy, feature reference and
> implementation planning document\
> **Status:** Proposed roadmap --- validate against the current codebase
> before implementation\
> **Product:** TrellisFlow\
> **Primary objective:** Evolve TrellisFlow from a financial tracking
> and management application into an intelligent, explainable personal
> and business wealth-management platform.\
> **Last prepared:** 24 November 2026

---

## 1. Executive summary

TrellisFlow should evolve beyond recording financial activity and
displaying historical reports. Its long-term purpose should be to help
users understand their financial position, identify what is changing,
anticipate what may happen next, evaluate choices and take
well-controlled action.

The intended product direction is:

**A comprehensive wealth-management platform with intelligence built
into every major area --- not an AI chatbot with a finance dashboard
attached.**

The platform should connect the user's personal finances, investments
and business finances while preserving clear ownership boundaries,
accurate accounting and a consolidated view of wealth.

The intelligence layer should do five things:

1.  **Understand:** explain the user's current financial position and
    historical activity.
2.  **Detect:** identify patterns, anomalies, risks, obligations and
    opportunities.
3.  **Predict:** estimate future cash flow, goal progress and possible
    outcomes using explicit assumptions.
4.  **Recommend:** offer relevant, evidence-based actions and explain
    their trade-offs.
5.  **Assist with execution:** prepare permitted changes and carry them
    out only after the required user confirmation.

AI is one enabling technology, not the product's sole source of
intelligence. Deterministic financial calculations, validated data,
reliable backend services, clear permissions, audit trails and good UX
are essential.

### Product principles

- Accuracy before sophistication.
- Explainable calculations and recommendations.
- Privacy and tenant isolation by design.
- Explicit approval for consequential actions.
- Graceful fallback when AI services are unavailable.
- Cost-aware and measurable AI usage.
- User control over data, preferences and automation.
- No fabricated financial figures, unsupported certainty or guaranteed
  investment outcomes.

---

## 2. Scope, source material and interpretation

This roadmap consolidates three inputs:

1.  The earlier TrellisFlow Wave 2.5 AI design document.
2.  The separate AI proposal describing a four-phase Money Copilot,
    smart entry, proactive insights and predictive cash flow.
3.  The product direction and additional feature areas discussed in the
    planning conversation.

### 2.1 Existing Wave 2.5 design

The earlier design document proposes four initial AI features, in this
order:

---

Priority Feature Intended value

---

P0 M-Pesa receipt/SMS Reduce
parsing transaction-entry
friction

P1 Transaction chatbot Create transactions,
answer queries and
navigate

P2 Site Q&A using Answer questions about
retrieval-augmented TrellisFlow
generation (RAG) documentation

P3 Insights narration Turn existing insights
into useful
explanations
-----------------------------------------------------------------------

It also proposes TypeScript throughout, Vercel AI SDK, Anthropic Claude
as the primary LLM provider, OpenAI embeddings for RAG, Zod validation,
pgvector, rate limits, cost logging, feature flags, prompt versioning
and a three-layer testing strategy.

These are proposals in the source document, not confirmation that the
packages, models, infrastructure or features are currently installed or
deployed. Verify current provider pricing, model identifiers, SDK
compatibility and deployment support before implementation.

### 2.2 Separate AI proposal

The other proposal groups AI work into four phases:

- Conversational Money Copilot.
- Natural-language transaction entry and receipt OCR.
- Proactive, contextual insights.
- Predictive cash flow.

It recommends an authenticated backend endpoint, controlled database
tools, a floating dashboard assistant and confirmation before actions
that change financial data.

### 2.3 Additional roadmap recommendations

The remaining capabilities in this document are product recommendations
added to make the roadmap broader than the initial AI feature set. They
should be assessed against the actual application, user needs, data
availability and implementation cost.

### 2.4 Important verification rule

The roadmap is a product plan, not a verified code audit. Before marking
any feature as existing or complete, inspect the repository, database
schema, API routes, UI pages, tests, deployment configuration and live
application. Do not assume that a feature exists merely because it
appears in a README or previous plan.

---

## 3. Product vision and positioning

### 3.1 Proposed product positioning

TrellisFlow is a unified personal and business wealth-management
platform that helps users track, understand, plan and improve their
financial position.

The platform should bring together:

- Personal income and expenses.
- Accounts and balances.
- Budgets and savings goals.
- Debt and repayment plans.
- Investments and asset values.
- Business income, expenses and profitability.
- Cash flow and financial obligations.
- Net worth and wealth progression.
- Financial insights, forecasts and recommendations.

### 3.2 From tracker to advisor

---

Traditional tracker Intelligent TrellisFlow

---

Records transactions Helps capture and categorize
transactions

Shows spending totals Explains patterns and changes

Displays budget status Warns when a budget may be exceeded

Shows current account balance Forecasts future cash positions

Displays savings progress Estimates goal completion dates

Lists investment values Explains portfolio performance and
concentration

Shows business reports Highlights drivers of business
performance

Displays alerts Prioritizes risks and suggests next
steps

Requires users to navigate manually Supports natural-language discovery
and controlled actions
-----------------------------------------------------------------------

### 3.3 Target user outcomes

A user should be able to answer:

- Where do I stand financially today?
- Where is my money going?
- What changed compared with last month or last year?
- What obligations are coming up?
- Am I likely to run short of cash?
- Am I on track to reach my goals?
- How are my investments performing?
- Which assets, categories or businesses are driving my results?
- What happens if I make a particular financial decision?
- What should I pay attention to next?

---

## 4. Product capability map

Organize the product into six connected intelligence areas.

1.  **Financial intelligence:** understand personal and household
    financial activity.
2.  **Predictive intelligence:** estimate future outcomes and detect
    emerging risks.
3.  **Automated financial operations:** reduce manual entry and
    repetitive work.
4.  **Investment intelligence:** understand portfolio performance,
    exposure and income.
5.  **Business intelligence:** understand business performance,
    profitability and cash flow.
6.  **Conversational and agentic AI:** let users ask questions and
    request controlled actions across the platform.

A seventh cross-cutting capability --- the **Financial Command Centre**
--- should bring the most important information from these areas into
one overview.

---

# PART I --- FEATURE CATALOGUE

## 5. Financial intelligence

### 5.1 Smart spending analysis

**Purpose:** Explain spending behaviour rather than merely listing
category totals.

**Capabilities** - Analyze spending by category, merchant, account and
time period. - Compare current spending with previous periods and
rolling averages. - Identify recurring patterns and changes in
behaviour. - Detect unusually large transactions or unusual category
activity. - Identify merchants or categories contributing most to
increases. - Distinguish one-off events from sustained trends where the
data permits. - Provide drill-down links to the underlying transactions.

**Example** \> Your transport spending is 18% higher than your recent
average. Three unusually expensive trips account for most of the
increase.

**Requirements** - Reliable transaction dates, amounts, categories and
merchant descriptions. - Consistent handling of refunds, transfers and
excluded transactions. - Clearly defined comparison periods. - Backend
calculations that can be reproduced and tested.

**Acceptance criteria** - Every displayed amount can be traced to source
transactions. - Comparisons use clearly stated date ranges. - Transfers
and refunds are treated consistently. - The user can inspect the
transactions behind an insight. - Missing or incomplete data is
disclosed.

### 5.2 Financial health score

**Purpose:** Provide an understandable snapshot of financial resilience
and progress.

Potential dimensions: - Savings rate. - Debt burden and repayment
pressure. - Emergency-fund coverage. - Cash-flow stability. - Budget
adherence. - Investment diversification, where sufficient data exists.

**Design requirements** - Publish the scoring methodology and component
weights. - Explain why a score changed. - Avoid implying that one score
is a definitive measure of financial wellbeing. - Do not penalize users
for unavailable data without explaining the effect. - Let users inspect
each contributing factor.

**Acceptance criteria** - Same input data and score version produce the
same result. - Score changes have an explanation. - Users can see the
underlying metrics. - The methodology is versioned and documented.

### 5.3 Subscription and recurring-payment intelligence

**Purpose:** Find recurring commitments and changes that may otherwise
go unnoticed.

**Capabilities** - Detect likely recurring transactions. - Identify
frequency, typical amount and next expected date. - Detect possible
price increases. - Flag duplicate or overlapping recurring charges. -
Identify subscriptions that have not appeared recently. - Let users
confirm, dismiss or correct detected recurring items.

**Important:** A recurring pattern is not proof of a subscription.
Present uncertain detections as suggestions.

### 5.4 Financial obligations calendar

**Purpose:** Bring upcoming financial commitments into one view.

Potential obligations: - Rent and utilities. - Loan repayments. -
Insurance. - School fees. - Subscriptions. - Tax deadlines. - Business
commitments. - User-created reminders.

**Capabilities** - Calendar and agenda views. - Due dates, expected
amounts and payment status. - Reminder preferences. - Recurrence
rules. - Links to related accounts, budgets or liabilities.

### 5.5 Emergency-fund intelligence

**Purpose:** Show how long available emergency savings could cover
essential expenses.

**Core calculation** - Emergency-fund coverage months = eligible
emergency savings / average monthly essential expenses.

**Requirements** - Let users define which accounts and expense
categories count. - Exclude restricted or unavailable funds. - Show the
calculation period and assumptions. - Avoid presenting the result as a
universal target.

### 5.6 Multi-currency intelligence

**Purpose:** Support financial activity across currencies without losing
the original transaction values.

**Capabilities** - Store original amount and currency. - Store
conversion rate, rate date and converted reporting amount. - Show
consolidated reporting in a selected base currency. - Distinguish
exchange-rate movement from actual investment or operating
performance. - Make rate sources and timestamps visible.

**Important:** Never overwrite the original transaction amount during
conversion.

### 5.7 Financial independence tracker

**Purpose:** Help users explore progress towards a chosen
financial-independence target.

Potential inputs: - Essential and total expenses. - Investable assets. -
Passive income. - Savings rate. - User-selected assumptions for
inflation and returns.

Present projections as scenarios, not promises. Explain assumptions and
uncertainty.

### 5.8 Tax intelligence

**Purpose:** Organize tax-relevant financial records and help users
prepare.

Potential capabilities: - Categorize potentially relevant income and
expenses. - Organize supporting documents. - Summarize records by tax
period. - Flag missing information. - Produce exportable summaries.

Tax rules are jurisdiction-specific and change over time. Any
calculation or filing guidance must use verified, current rules and
appropriate disclaimers. Do not claim that an estimate is a filing-ready
tax determination.

### 5.9 Household wealth management

**Purpose:** Support shared goals and household-level visibility while
protecting individual privacy.

Potential capabilities: - Shared household budgets and goals. - Separate
personal and shared accounts. - Member roles and permissions. -
Contribution tracking. - Shared obligations. - Clear attribution of
ownership.

This requires deliberate authorization and data-sharing design.
Household access must never be inferred merely from a relationship or
shared device.

---

## 6. Predictive intelligence

### 6.1 Intelligent cash-flow forecasting

**Purpose:** Estimate future cash positions using historical activity
and known future commitments.

**Inputs** - Historical income and expenses. - Current account
balances. - Recurring income and expenses. - Upcoming obligations. -
Confirmed future transactions. - User-entered expected income or one-off
expenses.

**Outputs** - Projected balance over time. - Expected low-balance
dates. - Potential shortfalls. - Forecast confidence or uncertainty
range. - Main drivers of projected changes.

**Requirements** - Start with a transparent deterministic baseline. -
Separate confirmed commitments from estimated patterns. - Support
scenario assumptions. - Show the forecast horizon and last-updated
time. - Avoid false precision. - Let users inspect the inputs that
influenced the forecast.

**Acceptance criteria** - Forecast calculations are tested independently
of AI. - Missing data is clearly disclosed. - Forecasts can be
reproduced from stored inputs and model version. - Users can compare
forecast with actual outcomes over time.

### 6.2 What-if financial simulator

**Purpose:** Let users explore the possible consequences of financial
decisions before committing.

Example questions: - What if I save KES 5,000 more every month? - What
if my income falls by 20%? - What if I buy a car worth KES 2 million? -
What if I repay an extra KES 10,000 on my loan? - What if I move to a
more expensive house?

**Outputs** - Change in monthly cash flow. - Change in savings and debt
trajectory. - Impact on selected goals. - Impact on projected net
worth. - Assumptions and trade-offs.

**Implementation** - Build a scenario calculation engine with typed
inputs. - Reuse tested financial calculation services. - Keep scenarios
separate from real account data. - Never silently create real
transactions from a simulation.

### 6.3 Early-warning system

Potential warnings: - Projected account shortfall. - Upcoming inability
to meet obligations. - Budget likely to be exhausted before month-end. -
Declining savings rate. - Unusual spending or account activity. -
Investment concentration or loss thresholds. - Business cash-flow
pressure.

Each warning should include: - What was detected. - The period and data
used. - Why it matters. - Confidence or severity. - A suggested next
step. - A way to dismiss, snooze or correct it.

Avoid alert fatigue. Prioritize material and actionable warnings.

### 6.4 Goal achievement forecasting

**Purpose:** Estimate when a user may reach a savings or financial goal.

Inputs: - Goal target. - Current progress. - Contribution schedule. -
Expected contribution changes. - Optional interest or return
assumptions.

Outputs: - Estimated completion date. - Required contribution to meet a
chosen date. - Difference between current pace and target pace.

Clearly distinguish simple savings projections from investment-return
projections.

### 6.5 Forecast evaluation

Forecasting must be measured after launch.

Track: - Forecast versus actual balances. - Error by forecast horizon. -
Error by income regularity. - Error by account or financial context. -
Frequency of missed obligations. - User corrections to expected
recurring items.

Do not market a forecast as reliable until it has been evaluated on
representative data.

---

## 7. Automated financial operations

### 7.1 Intelligent transaction categorization

**Purpose:** Reduce manual categorization.

Use: - Merchant and description matching. - User's previous
corrections. - Category history. - Transaction type and account
context. - Optional model-assisted classification.

**Requirements** - Return a confidence or certainty indicator. - Allow
user correction. - Store user-approved category preferences. - Avoid
silently changing historical categories without permission. - Do not let
untrusted transaction text act as instructions to the AI.

### 7.2 Duplicate transaction detection

Detect possible duplicates using: - Amount. - Currency. - Date/time
proximity. - Merchant or reference. - Account. - Imported source
identifiers.

Present likely duplicates for review. Do not automatically delete
records based only on similarity.

### 7.3 Financial data reconciliation

Compare: - Imported M-Pesa records. - Bank or account statements. -
Manually entered transactions. - Account balances. - Transfer pairs. -
Opening and closing balances.

Show unmatched records, discrepancies and likely explanations. Preserve
source records and record user decisions.

### 7.4 Smart financial reminders

Create reminders for: - Upcoming obligations. - Budget thresholds. -
Savings contributions. - Loan repayments. - Goal milestones. - Missing
reconciliation items. - User-defined financial events.

Users control channels, frequency, quiet hours and notification
preferences.

### 7.5 Automated financial reports

Generate: - Weekly summaries. - Monthly financial reviews. - Quarterly
reviews. - Annual financial summaries. - Investment performance
reports. - Business performance reports. - Goal progress reports.

Reports should include: - Reporting period. - Data coverage. - Key
figures. - Comparisons. - Major drivers. - Exceptions and caveats. -
Links or references to underlying records.

AI may explain the report, but the figures must come from trusted
backend calculations.

### 7.6 Financial document intelligence

Potential document types: - Bank statements. - M-Pesa statements. -
Receipts. - Invoices. - Loan statements. - Investment statements. -
Insurance documents.

Capabilities: - Extract text and structured fields. - Identify document
type. - Extract dates, totals, parties and references. - Match records
to existing transactions. - Flag uncertain or conflicting values. - Let
users review before importing.

Protect uploaded documents with access controls, retention policies and
safe file processing.

---

## 8. Investment intelligence

### 8.1 Portfolio performance intelligence

Show: - Portfolio value over time. - Contributions and withdrawals. -
Realized and unrealized gains. - Income received. - Asset allocation. -
Performance by asset and asset class. - Currency exposure. -
Contribution of holdings to total performance.

Define performance methodology carefully. Avoid mixing deposits with
investment returns.

### 8.2 Investment risk analysis

Potential checks: - Concentration in one asset. - Sector
concentration. - Currency concentration. - Asset-class concentration. -
Volatility and drawdown, where reliable market data exists. - Exposure
to correlated assets, where data supports it.

Present risk indicators as educational information, not a personalized
guarantee or instruction to buy or sell.

### 8.3 Investment opportunity watchlist

Capabilities: - Track selected assets. - User-defined target prices. -
Price and percentage-change alerts. - Watchlist notes. - Event or
dividend reminders where data is available.

Clearly label market-data source and timestamp. Do not imply real-time
pricing if data is delayed.

### 8.4 Dividend and passive-income tracker

Track: - Dividends. - Interest. - Rental income. - Other recurring
passive income.

Show gross and net amounts where fees or taxes are known, payment dates,
currency and source asset.

### 8.5 Investment scenario simulator

Allow users to model: - Regular contributions. - Different time
horizons. - Hypothetical returns. - Fees and taxes where supported. -
Loss and downside scenarios. - Inflation-adjusted outcomes.

All projections must be labeled hypothetical and assumption-dependent.

---

## 9. Business intelligence

### 9.1 Business performance copilot

Example questions: - Which business generated the highest profit this
quarter? - Why did expenses increase? - Which business is consuming the
most cash? - How did revenue change compared with last quarter?

The assistant must use approved business analytics tools and respect
business-level permissions.

### 9.2 Business cash-flow forecasting

Forecast: - Expected collections. - Operating expenses. - Payroll and
supplier commitments. - Loan repayments. - Expected cash runway. -
Potential shortfalls.

Distinguish invoiced, expected and actually received revenue.

### 9.3 Profitability intelligence

Where data supports it, analyze profitability by: - Product. -
Service. - Customer. - Business unit. - Location. - Project.

Do not infer product-level profit if cost allocation data is missing.

### 9.4 Business-personal wealth connection

Show how business finances affect the user's consolidated wealth.

Must distinguish: - Owner contributions. - Owner withdrawals. -
Dividends or distributions. - Inter-account transfers. - Business assets
and liabilities. - User's ownership share.

**Critical accounting rule:** Avoid double-counting the same value as
both a personal asset and a business asset. Define ownership and
consolidation rules explicitly.

### 9.5 Business comparison

Compare businesses by: - Revenue. - Expense growth. - Gross and net
margins. - Cash runway. - Receivables and payables. - Profitability
trends. - Data completeness.

Comparisons should use equivalent reporting periods and consistent
definitions.

---

## 10. Conversational and agentic AI

### 10.1 TrellisFlow AI Copilot

A conversational assistant available from the main application
experience.

It should answer questions across: - Personal finances. -
Transactions. - Budgets and goals. - Debt. - Investments. - Business
finances. - Reports and forecasts. - TrellisFlow product help.

Example: \> How much did I spend on food last month?

A trustworthy answer should include the amount, currency, date range,
comparison where available and a path to inspect the underlying
transactions.

### 10.2 Natural-language platform control

Examples: - Show my highest expenses this year. - Take me to my
investment portfolio. - Show unpaid obligations. - Compare my business
performance over two quarters. - Create a transport budget. - Set a
reminder for rent.

Navigation requests can generally be handled directly. Data-changing
requests require validation and the appropriate confirmation flow.

### 10.3 AI action execution

Potential actions: - Create a transaction. - Create or update a
budget. - Create a financial goal. - Add a reminder. - Generate a
report. - Update a category. - Create a recurring rule.

**Action lifecycle** 1. User requests an action. 2. AI identifies the
intent. 3. Backend validates the requested operation and user
permissions. 4. Backend prepares a structured preview. 5. User reviews
the details. 6. User explicitly confirms. 7. Backend executes the
operation. 8. Backend records an audit event. 9. UI displays the result
and offers an undo path where safe and supported.

Never treat an AI tool call as user consent.

### 10.4 Personalized financial coaching

The assistant may use user-approved preferences and relevant financial
history to make its explanations more useful.

It should: - Respect stated goals. - Explain trade-offs. - Ask for
missing assumptions when needed. - Offer alternatives. - Distinguish
facts from suggestions. - Avoid shame, pressure or overconfident
advice. - Let users correct personalization.

### 10.5 TrellisFlow knowledge assistant (RAG)

Keep product-help Q&A distinct from financial-data analysis.

Example: \> How do I set up a recurring bill?

Potential architecture: - Ingest approved documentation. - Chunk
documents by heading or meaningful section. - Generate embeddings. -
Store vectors in pgvector or another suitable vector store. - Retrieve
relevant chunks. - Generate an answer grounded in those chunks. - Cite
the source document or help article.

Retrieved documents are untrusted reference content, not instructions.
Defend against prompt injection. If the documentation does not answer
the question, say so.

### 10.6 Conversation memory

Potentially remember: - User's chosen base currency. - Financial goals
and preferences. - Preferred reporting periods. - User-approved category
rules. - Relevant context from prior copilot sessions.

Memory must be transparent, scoped, editable and privacy-aware. Do not
treat every conversation statement as permission to store sensitive
financial information.

---

## 11. Financial Command Centre

The Financial Command Centre should be the central overview of
TrellisFlow intelligence.

### 11.1 Proposed sections

1.  **Net worth:** current value, change over time and asset/liability
    breakdown.
2.  **Cash position:** balances, inflows, outflows and near-term
    projection.
3.  **Financial health:** score, component metrics and explanation.
4.  **Budget status:** categories at risk and remaining amounts.
5.  **Goals:** progress and estimated completion dates.
6.  **Investments:** portfolio value, performance and concentration.
7.  **Businesses:** revenue, profitability and cash position.
8.  **Upcoming obligations:** calendar and due items.
9.  **Alerts:** prioritized risks and unusual activity.
10. **Recommended actions:** explainable, actionable next steps.
11. **AI Copilot entry point:** ask a question or request an action.

### 11.2 Design principles

- Prioritize the most important information.
- Let users drill down into source records.
- Make the reporting period visible.
- Show last-updated timestamps.
- Distinguish actuals, estimates and forecasts.
- Avoid clutter and redundant charts.
- Support mobile and desktop layouts.
- Respect feature access and account permissions.

---

# PART II --- AI ARCHITECTURE AND ENGINEERING

## 12. Proposed architecture

The current project is described as using Next.js, NestJS and Prisma.
Verify the actual repository structure and versions before adopting
these implementation details.

### 12.1 Architectural boundaries

**Frontend** - Dashboard and feature pages. - Copilot interface. -
Smart-entry and document-upload interfaces. - Forecast and scenario
visualizations. - Confirmation and review flows.

**Backend** - Authentication and authorization. - Financial domain
services. - Deterministic calculation engines. - AI orchestration. -
Tool definitions and validation. - Background jobs. - Audit logging. -
Rate limiting and usage monitoring.

**Database** - Existing financial domain records. - Forecast and
scenario records where needed. - AI usage records. - Prompt/model
version metadata. - Document and retrieval metadata where needed. -
Audit events.

**External services** - LLM provider. - Embedding provider, if RAG is
implemented. - Market-data sources, if investment intelligence requires
them. - OCR/document processing services, if needed. - Notification
providers.

### 12.2 Controlled AI tools

Do not allow the model to generate and execute arbitrary Prisma queries.

Provide narrowly scoped tools such as:

- `getFinancialSummary`
- `getSpendingAnalysis`
- `getRecentTransactions`
- `getBudgetStatus`
- `getGoalProgress`
- `getDebtSummary`
- `getInvestmentPerformance`
- `getBusinessPerformance`
- `getCashflowForecast`
- `runFinancialScenario`
- `createTransaction`
- `createBudget`
- `createGoal`
- `createReminder`
- `generateFinancialReport`
- `navigateToPage`

Every tool must: - Validate arguments. - Derive user identity from the
authenticated request, not model input. - Enforce authorization and
tenant boundaries. - Limit returned records and fields. - Avoid exposing
secrets or unnecessary personal data. - Log consequential operations. -
Require confirmation for data-changing actions.

### 12.3 Deterministic calculations versus AI

Use deterministic backend code for: - Totals and balances. - Budget
utilization. - Savings rates. - Debt calculations. - Net worth. -
Investment performance methodology. - Forecast arithmetic. - Scenario
calculations. - Financial health score. - Duplicate matching rules.

Use AI for: - Natural-language interpretation. - Structured extraction
from unstructured input. - Choosing among approved tools. - Explaining
calculated results. - Summarizing trends. - Generating user-friendly
narratives.

The LLM should not be the source of truth for financial arithmetic.

### 12.4 Provider strategy

The earlier Wave 2.5 design proposes: - Vercel AI SDK for provider
abstraction and application integration. - Anthropic Claude as the
primary LLM provider. - OpenAI embeddings for RAG. - Zod for structured
output validation. - pgvector for document retrieval.

This is a proposed combination, not a mandatory final decision. Before
implementation: - Verify current SDK APIs and compatibility. - Verify
current model identifiers and availability. - Compare quality, latency,
privacy terms and total cost. - Confirm provider data-retention
settings. - Keep provider-specific code behind an internal abstraction
where useful. - Avoid unnecessary multi-provider complexity in the first
release.

### 12.5 Suggested NestJS module organization

Illustrative structure only; align it with existing project conventions.

```text
apps/api/src/modules/ai/
├── ai.module.ts
├── ai.controller.ts
├── ai.service.ts
├── dto/
│   ├── chat.dto.ts
│   ├── parse-mpesa.dto.ts
│   └── parse-document.dto.ts
├── schemas/
│   ├── mpesa-parse.schema.ts
│   ├── transaction-draft.schema.ts
│   └── intent.schema.ts
├── prompts/
│   ├── mpesa-parse.prompt.ts
│   ├── copilot.prompt.ts
│   └── insight-narration.prompt.ts
├── tools/
│   ├── financial-summary.tool.ts
│   ├── transaction-query.tool.ts
│   ├── budget.tool.ts
│   └── action-tools.ts
├── services/
│   ├── mpesa-parser.service.ts
│   ├── copilot.service.ts
│   ├── rag.service.ts
│   └── narration.service.ts
└── guards/
    └── ai-throttle.guard.ts
```

Keep domain logic in the existing transaction, budget, investment and
business services. The AI module should orchestrate those services, not
duplicate their business rules.

---

## 13. Wave 2.5 AI features --- detailed implementation reference

### 13.1 Feature 1: M-Pesa SMS and receipt parsing (P0)

**Implementation status — 2026-11-24**

The implementation is on `feature/mpesa-sms-parser`; PR #50 is open against `develop`. No merge has been performed. `main` and `develop` remain untouched; the repository owner will handle all merges.

The latest complete GitHub Actions run passed lint, typecheck, build, unit tests, database migrations, integration tests, and E2E tests.

Implemented in this increment:
- Anthropic Claude is the initial provider, behind a provider-agnostic internal interface. The model and API key are server-configured; the adapter uses the Anthropic Messages API.
- Authenticated parsing accepts one pasted SMS or one JPG, PNG or WebP receipt image (maximum 5 MB).
- Structured output is validated with Zod. Missing values remain unknown, confidence and uncertainty are returned, and unsupported events are not forced into income/expense.
- Duplicate M-Pesa references are checked and protected by a user-scoped unique database constraint.
- Users review and edit a draft before confirmation. Confirmation reuses the existing transaction service; extraction itself never creates a transaction.
- Raw SMS and receipt bytes are not persisted by TrellisFlow. The UI discloses that input is sent to Anthropic for extraction.
- Synthetic golden fixtures cover received/sent money, Buy Goods, PayBill, cash withdrawals/deposits, reversals, and Fuliza advances. Tests verify schema expectations and review-before-save behaviour.
- Daily per-user parsing quota is enforced atomically in PostgreSQL (20 requests per UTC day by default, configurable). Failed provider attempts also consume a reservation, preventing repeated retries from bypassing the limit.
- Anthropic input/output token usage is recorded without source content. Optional USD cost estimates can be enabled with model-specific per-million-token rates. Usage events and daily aggregates are stored separately from transaction records.

Still required before enabling this for users:
- Configure an Anthropic API key and select/verify the production model in the target environment; the feature flag remains off by default.
- Run live-provider evaluations against representative Safaricom SMS and receipt fixtures, including OCR quality and field-level accuracy. Synthetic fixture tests do not establish real-provider accuracy.
- Configure verified pricing rates if estimated USD costs are required; token counts are recorded regardless.
- Complete product/privacy review of Anthropic API data handling and manual UI verification with real receipts.
- Transfer drafts are currently identified but must be recorded through the dedicated paired-account transfer workflow; ordinary confirmation is blocked to protect account balances.


**User flow** 1. User opens the transaction page. 2. User selects Scan
or Import M-Pesa. 3. User pastes an SMS or provides a supported receipt. 4. User requests parsing. 5. Backend validates input and calls the
extraction service. 6. AI returns structured data. 7. Backend validates
the output against a Zod schema. 8. UI displays a reviewable transaction
draft. 9. User corrects any field if necessary. 10. User confirms. 11.
Existing transaction service creates the transaction. 12. The
application records source metadata and relevant audit information.

**Potential extracted fields** - Transaction type: income, expense or
transfer. - Amount. - Currency. - Date and time. - Description or
merchant. - Counterparty. - M-Pesa reference. - Account or payment
method, if reliably identified. - Confidence or field-level uncertainty.

**Example schema**

```ts
import { z } from 'zod';

export const MpesaParseSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive(),
  currency: z.literal('KES'),
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  description: z.string().min(1).max(200),
  counterparty: z.string().nullable(),
  mpesaReference: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
```

This is an illustrative starting contract. Align enums and fields with
the actual Prisma schema and transaction API.

**Important parsing cases to test** - Money sent to a person. - Money
received from a person. - Buy Goods / till payment. - Paybill payment. -
Withdrawal. - Deposit. - Reversal. - Fuliza or other credit-related
messages. - Account-to-account transfer. - Multiple amounts in one
SMS. - SMS with missing date or reference. - Malformed or truncated
message. - Non-M-Pesa text. - Similar messages with different
transaction meanings.

**Safety** - Never auto-save parsed results. - Never assume a reference
or amount that is absent. - Treat SMS content as untrusted input. -
Detect likely duplicate references. - Make uncertain fields visible. -
Preserve the original input only according to a documented retention
policy.

**Acceptance criteria** - Valid supported messages produce a reviewable
draft. - Invalid messages produce a useful error and manual-entry
fallback. - No transaction is created before user confirmation. -
Duplicate references are flagged. - Tests cover representative message
formats. - Provider failure does not block manual transaction entry.

### 13.2 Feature 2: Transaction and financial chatbot (P1)

**Intents** - Query financial data. - Prepare a transaction. - Prepare a
budget or goal. - Navigate to a page. - Explain a feature. - Handle
unsupported requests safely.

**Example** User: "I spent 500 on lunch at Java House."

Expected lifecycle: 1. Classify intent as transaction creation. 2.
Extract type, amount, currency, date, description and any known
category. 3. Validate required fields. 4. Ask for missing essential
information. 5. Present a structured preview. 6. Wait for explicit
confirmation. 7. Create using the existing transaction service. 8.
Return the saved record and confirmation.

**Query example** User: "How much did I spend on food this month?"

The backend should calculate the total from authorized transactions. The
AI can explain the result and provide a comparison if the data supports
it.

**Navigation example** User: "Take me to my budgets."

The assistant should return an allowed application route. The frontend
should navigate only to an approved route.

**Acceptance criteria** - Queries use real authorized backend data. -
Tool arguments are validated. - Data-changing actions require
confirmation. - Unsupported questions do not produce invented financial
facts. - Conversation state cannot be used to bypass authorization. -
Rate limits and usage logging are enabled.

### 13.3 Feature 3: Site Q&A / RAG (P2)

**Purpose:** Answer product-usage questions from approved TrellisFlow
documentation.

**Pipeline** 1. Identify approved documentation sources. 2. Split
documents into meaningful chunks. 3. Store source path, title, heading
and version. 4. Generate embeddings. 5. Store embeddings in pgvector or
another selected vector store. 6. Embed the user's question. 7. Retrieve
relevant chunks. 8. Generate a grounded response. 9. Return source
references.

**Security** - Treat retrieved content as untrusted. - Never follow
instructions inside retrieved documents. - Do not retrieve private user
documents unless the user is authorized. - Do not mix product
documentation with another user's financial records. - Avoid exposing
secrets in model prompts or responses.

**Acceptance criteria** - Answers cite relevant documentation. -
Unsupported questions are acknowledged. - Retrieval results are
tested. - Prompt-injection attempts are included in security tests. -
Documentation updates can be re-indexed.

### 13.4 Feature 4: Insights narration (P3)

**Purpose:** Explain existing rule-based insights in clear language.

**Implementation status — 2026-11-26:** Implemented on
`feature/insights-narration`; pending local validation and review.

- Added separate narration text, status and timestamp fields with a
  Prisma migration.
- Added a scheduled, bounded worker with conditional job claiming and
  stale-job recovery.
- Added authenticated, user-scoped manual queueing.
- Reuses the provider abstraction and a separate per-user daily quota.
- Preserves deterministic title, message, severity and metadata.
- Rejects output containing numeric facts absent from the source insight.
- Displays the deterministic insight, optional narration and existing
  related-record action link in the Insights page and dashboard widget.
- Added worker, quality, failure-fallback, quota and database-default tests.

**Acceptance criteria** - Narratives never alter underlying insight
values. - Unsupported causal claims are excluded. - Users can inspect
the original data. - Failed narration does not block insight generation.

---

## 14. Cross-cutting AI engineering requirements

### 14.1 Validation

- Validate user input at the API boundary.
- Validate all structured model output.
- Use enums and bounded numeric fields.
- Validate dates, currencies and identifiers.
- Reject unexpected fields where appropriate.
- Never save unvalidated model output.

### 14.2 Rate limiting

The earlier Wave 2.5 proposal suggests these initial limits:

Feature Proposed limit

---

M-Pesa parsing 20 parses per user per day
Chatbot 50 messages per user per day
RAG Q&A 30 questions per user per day
Insights narration Background processing, with job controls

These are starting proposals only. Adjust based on observed usage,
provider quotas, subscription tiers and abuse patterns.

### 14.3 Cost monitoring

Track each model call with: - User or tenant identifier, where
appropriate. - Feature. - Provider and model. - Prompt version. - Input
and output token counts. - Estimated cost. - Latency. - Success or
failure. - Timestamp. - Correlation/request identifier.

The earlier design proposes an `LlmCall` record with feature, token,
cost and success information. Extend or adapt this to the current schema
and privacy policy.

Set budgets and alerts at both system and feature level. Avoid logging
full financial prompts or sensitive content unless explicitly necessary
and governed by retention controls.

### 14.4 Feature flags

Suggested flags: - `AI_MPESA_PARSE_ENABLED` - `AI_CHATBOT_ENABLED` -
`AI_RAG_ENABLED` - `AI_NARRATOR_ENABLED` - `AI_DOCUMENT_PARSE_ENABLED` -
`AI_FORECAST_EXPLANATIONS_ENABLED`

Feature flags should support staged rollout and fast disablement. Core
financial functionality must continue when an AI flag is off.

### 14.5 Prompt versioning

- Store prompts in source control.
- Assign explicit versions.
- Record the prompt version used for each relevant operation.
- Document why a prompt changed.
- Run evaluation datasets after changes.
- Do not treat prompts as informal text that can change without
  regression testing.

### 14.6 Testing strategy

**Unit tests** - Schemas. - Prompt assembly. - Tool argument
validation. - Calculation logic. - Error handling. - Authorization
conditions.

**Integration tests** - AI orchestration with mocked model calls. - Real
database services where appropriate. - User isolation. - Confirmation
lifecycle. - Audit event creation.

**End-to-end tests** - Full user workflow with mocked provider
responses. - Manual staging tests against real providers where
explicitly enabled.

**Evaluation datasets** - Maintain representative examples and expected
structured outputs. - Measure field-level extraction accuracy. - Test
edge cases and ambiguous inputs. - Run evaluations when prompts, models
or schemas change. - Keep real-provider tests out of routine CI unless
intentionally configured.

### 14.7 Error handling and fallback

Every AI feature should: 1. Apply input validation. 2. Apply timeout and
retry policy where appropriate. 3. Log safe operational metadata. 4.
Return a clear, actionable error. 5. Preserve the non-AI workflow. 6.
Avoid partial or duplicate financial writes.

Examples: - Parsing unavailable: use manual transaction entry. - Copilot
unavailable: use normal pages and reports. - RAG unavailable: browse
documentation. - Narration unavailable: show the original insight. -
Forecast explanation unavailable: show the deterministic forecast and
assumptions.

---

# PART III --- SECURITY, PRIVACY AND TRUST

## 15. Security requirements

### 15.1 User and tenant isolation

- Derive user identity from authenticated server context.
- Never trust a user ID supplied by the LLM.
- Apply ownership filters in every domain service.
- Test cross-user access attempts.
- Enforce business and household membership permissions.
- Avoid broad database access from AI services.

### 15.2 Secrets

- Keep provider API keys on the server.
- Use environment variables or a managed secret store.
- Never commit secrets.
- Never expose secrets to browser bundles.
- Rotate compromised keys.
- Use separate development, staging and production credentials.

### 15.3 Prompt injection and untrusted content

Potential untrusted inputs include: - M-Pesa SMS text. - Receipts and
uploaded documents. - Merchant descriptions. - Imported statements. -
Retrieved documentation. - User-provided content.

Treat these as data, not instructions. Use strict tool allowlists and
server-side authorization. Do not let content alter system rules or
grant capabilities.

### 15.4 Data minimization and retention

- Send only the fields needed for the requested operation.
- Avoid including entire transaction histories when a summary will
  suffice.
- Define retention for prompts, files and extracted text.
- Provide appropriate deletion and export workflows.
- Review provider data-use and retention terms.
- Do not use financial data for model training without an explicit,
  valid basis and clear user consent.

### 15.5 Auditability

Record: - User-requested action. - Validated action preview. -
Confirmation event. - Executed operation. - Timestamp and actor. -
Relevant before/after values where appropriate. - Source channel, such
as UI or copilot. - Correlation identifier.

Do not store unnecessary sensitive conversation content in audit logs.

### 15.6 Human approval levels

---

Operation Suggested policy

---

Read-only financial query Allowed after authorization

Page navigation Allowed within an approved route
list

Draft transaction Prepare and preview

Save transaction Explicit confirmation

Create or change budget Confirmation

Create or change goal Confirmation

Delete financial record Strong confirmation and audit

External payment or transfer Do not enable without a separately
designed, highly controlled
authorization system
-----------------------------------------------------------------------

---

# PART IV --- IMPLEMENTATION ROADMAP

## 16. Roadmap overview

The following waves are a proposed product sequence. They are not a
statement that all preceding waves are complete. First audit the current
application and map existing features to these areas.

---

Wave Name Main outcome

---

0 Product and technical Verified baseline and
audit dependency map

1 Core financial Reliable personal
foundation finance data

2 Investments and wealth Portfolio and
consolidated net worth

3 Business financial Business performance
management and cash flow

4 Financial intelligence Analysis, reports and
health metrics

5 Predictive intelligence Forecasts, warnings and
simulations

6 AI financial copilot Parsing, chat and
controlled actions

7 Investment and business Deeper portfolio and
intelligence business analysis

8 Autonomous financial User-approved proactive
operations workflows
-----------------------------------------------------------------------

## 17. Wave 0 --- Product and technical audit

**Priority:** P0 --- do before implementation planning is finalized.

### Objectives

- Establish what is already implemented.
- Identify incomplete or unreliable modules.
- Confirm actual stack, schema and deployment.
- Avoid rebuilding existing capabilities.

### Tasks

1.  Inspect repository structure and package versions.
2.  Inspect Next.js routes and application layouts.
3.  Inspect NestJS modules, controllers and services.
4.  Inspect Prisma schema and migrations.
5.  Inspect authentication and authorization.
6.  Inspect current transaction, budget, debt, goal and investment
    flows.
7.  Inspect business finance features.
8.  Inspect net-worth calculations and transfer handling.
9.  Inspect tests and CI.
10. Inspect production deployment and environment configuration.
11. Compare the live UI with repository functionality.
12. Create an existing / partial / missing / needs-refactor feature
    matrix.

### Deliverables

- Current-state architecture diagram.
- Feature inventory.
- Database and API dependency map.
- Technical debt list.
- Security findings.
- Revised implementation backlog.

### Exit criteria

No feature is labeled as complete without code or product evidence.

## 18. Wave 1 --- Core financial foundation

**Goal:** Ensure the financial records and calculations are reliable.

Verify or implement: - Accounts and balances. - Income and expense
transactions. - Transfers. - Categories. - Budgets. - Savings goals. -
Debt and repayment tracking. - Recurring transactions or obligations. -
Transaction imports. - Data export. - Audit history. - Currency
handling.

### Critical correctness work

- Define transfer treatment.
- Define refund and reversal treatment.
- Define account balance methodology.
- Define transaction date/time and timezone handling.
- Define ownership and consolidation rules.
- Prevent double-counting.
- Add calculation tests.

**Exit criteria:** Core financial reports reconcile to source records
and key calculations have automated tests.

## 19. Wave 2 --- Investments and wealth

Verify or implement: - Investment accounts. - Holdings and asset
classes. - Transactions and contributions. - Valuation history. -
Realized and unrealized gains. - Income distributions. - Asset
allocation. - Consolidated net worth.

**Exit criteria:** Users can trace portfolio values and net worth to
underlying holdings, balances and liabilities.

## 20. Wave 3 --- Business financial management

Verify or implement: - Business profiles. - Business accounts. - Income
and expenses. - Revenue and expense reports. - Profit and loss. - Cash
flow. - Receivables and payables if in scope. - Cash runway. - Owner
contributions and withdrawals. - Business-to-personal consolidation
rules.

**Exit criteria:** Business reports are internally consistent and
consolidated wealth avoids double-counting.

## 21. Wave 4 --- Financial intelligence

**Goal:** Deliver meaningful intelligence before introducing complex AI
workflows.

Recommended order: 1. Spending analysis. 2. Recurring-payment detection. 3. Duplicate detection. 4. Reconciliation. 5. Financial obligations
calendar. 6. Emergency-fund coverage. 7. Financial health score. 8.
Automated reports. 9. Financial Command Centre.

**Why this wave matters:** A copilot is only as trustworthy as the data
and calculations it can access.

**Exit criteria** - Metrics are deterministic and tested. - Insights
link to source data. - Users can correct false detections. - Reports
disclose date ranges and data coverage.

## 22. Wave 5 --- Predictive intelligence

Recommended order: 1. Goal completion forecasting. 2. Basic cash-flow
forecasting. 3. Budget exhaustion warnings. 4. Upcoming obligation
warnings. 5. Scenario simulator. 6. Business cash-flow forecast. 7.
Investment scenario tools. 8. Forecast evaluation and calibration.

Start with simple, transparent methods. Add statistical or
machine-learning approaches only when data quality and measured
performance justify them.

**Exit criteria** - Forecast assumptions are visible. - Predictions are
evaluated against actual outcomes. - Users can distinguish actuals from
estimates. - Forecast failures do not affect recorded financial data.

## 23. Wave 6 --- AI financial copilot

Recommended implementation sequence:

### Step 1 --- AI infrastructure

- Provider abstraction.
- Server-side secret management.
- Zod schemas.
- Usage logging.
- Rate limiting.
- Feature flags.
- Timeout and fallback handling.
- Test mocks and evaluation harness.

### Step 2 --- M-Pesa parsing (P0)

- Input validation.
- Parser service.
- Structured extraction.
- Review UI.
- Duplicate checks.
- Confirm-and-save flow.
- Golden test dataset.

### Step 3 --- Natural-language transaction entry

- Parse ordinary language into a transaction draft.
- Ask for missing required details.
- Preview and confirm.
- Use existing transaction service.

### Step 4 --- Read-only financial copilot

- Financial summary tool.
- Spending analysis tool.
- Budget status tool.
- Recent transactions tool.
- Goal progress tool.
- Investment and business query tools as data permits.

### Step 5 --- Controlled action tools

- Create transaction.
- Create budget.
- Create goal.
- Create reminder.
- Generate report.
- Confirmation lifecycle and audit logging.

### Step 6 --- Chat interface

- Dashboard entry point.
- Conversation history.
- Streaming or responsive loading state.
- Tool activity and action previews.
- Error and retry states.
- Mobile responsiveness.

### Step 7 --- Insights narration

- Background job.
- Narrative generation.
- Source-linked facts.
- Graceful fallback.

### Step 8 --- RAG knowledge assistant

- Documentation ingestion.
- Chunking and embeddings.
- Vector retrieval.
- Citations.
- Injection testing.

### Step 9 --- Document and receipt OCR

- Secure upload.
- File validation and size limits.
- OCR or vision extraction.
- Structured validation.
- Review and confirmation.
- Retention and deletion policy.

**Exit criteria** - All model outputs are validated. - All data access
is authorized. - All write actions require the intended confirmation. -
Cost and rate controls are active. - Manual workflows continue to
work. - Evals cover supported input formats.

## 24. Wave 7 --- Investment and business intelligence

Recommended order: 1. Portfolio performance explanations. 2. Asset and
currency concentration analysis. 3. Dividend and passive-income
reporting. 4. Investment watchlist alerts. 5. Business performance
copilot. 6. Profitability analysis where data supports it. 7. Business
cash-flow explanations. 8. Cross-business comparisons.

**Exit criteria:** Recommendations and explanations are traceable to
verified data, and market-data freshness is disclosed.

## 25. Wave 8 --- Autonomous financial operations

This wave should be approached carefully and only after the previous
capabilities are reliable.

Potential workflows: - Prepare a weekly financial review. - Notify users
of material forecast changes. - Prepare a monthly report. - Remind users
about upcoming obligations. - Suggest a budget adjustment. - Prepare a
savings contribution reminder. - Identify transactions awaiting
reconciliation. - Prepare a recurring transaction draft.

Start with recommendations and drafts. Add execution only for narrowly
scoped actions with explicit user approval, permissions, audit trails
and recovery paths.

**Exit criteria** - Each automation has a clear trigger and scope. -
Users can pause, edit or disable it. - Actions are idempotent where
possible. - Failures are visible and recoverable. - No external movement
of money occurs without a separately reviewed authorization design.

---

# PART V --- PRIORITIES AND DEPENDENCIES

## 26. Priority definitions

---

Priority Meaning

---

P0 Foundational, high-value or
necessary for safety and
correctness

P1 High-value capability to build
after core dependencies

P2 Valuable enhancement with moderate
dependency or complexity

P3 Later-stage refinement or optional
capability
-----------------------------------------------------------------------

Priority should reflect user value, risk reduction, dependencies,
confidence and effort --- not how impressive a feature sounds.

## 27. Proposed feature priority matrix

---

Feature Proposed priority Main dependency

---

Product and technical P0 Repository access
audit

Core financial data P0 Existing domain model
correctness

M-Pesa SMS parsing P0 Transaction API and
validation

Smart transaction P1 Reliable transaction
categorization history

Duplicate detection P1 Transaction identifiers
and matching

Spending analysis P1 Accurate transactions
and categories

Read-only financial P1 Approved financial
copilot query tools

Natural-language P1 Parser and transaction
transaction draft workflow

Cash-flow forecasting P1 Balances and recurring
data

Financial obligations P1 Due dates and
calendar recurrence

Financial health score P2 Defined metric
methodology

Scenario simulator P2 Financial calculation
services

Receipt/document OCR P2 Secure file pipeline

Investment risk P2 Reliable holdings and
analysis market data

Business performance P2 Business reporting
copilot services

RAG product Q&A P2 Maintained
documentation

Insights narration P3 Existing insight engine

Household wealth P3 Membership and
management permission model

Tax intelligence P3 Verified
jurisdiction-specific
rules

Advanced autonomous P3 Mature controls and
workflows auditability
-----------------------------------------------------------------------

This matrix is a starting recommendation. Re-score after the Wave 0
audit and user research.

## 28. Key dependencies

```text
Reliable financial records
        |
        +--> Deterministic calculations
        |        |
        |        +--> Spending analysis
        |        +--> Financial health score
        |        +--> Forecasting
        |        +--> Scenario simulation
        |        +--> Financial Command Centre
        |
        +--> Transaction import and parsing
        |        |
        |        +--> M-Pesa parsing
        |        +--> Document OCR
        |        +--> Reconciliation
        |
        +--> Secure domain APIs
                 |
                 +--> Read-only AI copilot
                 +--> Controlled action tools
                 +--> Business and investment assistants
```

---

# PART VI --- DATA AND DOMAIN DESIGN

## 29. Data design considerations

Do not add database tables just because they appear in this document.
First check whether the existing schema already represents the required
concepts.

Potential additions, depending on the current design:

---

Concept Possible purpose

---

RecurringTransaction Store confirmed or user-managed
recurring rules

FinancialForecast Store forecast runs and assumptions

FinancialScenario Store user-created what-if
scenarios

ForecastPoint Store projected values by date

FinancialAlert Store detected and user-reviewed
warnings

Document Track secure uploaded financial
documents

DocumentExtraction Store validated extraction results

AiUsageLog / LlmCall Track model usage and operational
cost

AiAction Track action preview, confirmation
and execution

PromptVersion Identify the prompt version used

DocumentChunk Store RAG chunks and vector
metadata

AuditEvent Track consequential user and system
actions
-----------------------------------------------------------------------

### 29.1 Financial data integrity

Define: - Currency precision and decimal types. - Date and timezone
conventions. - Transaction lifecycle and reversal handling. - Transfer
pairing. - Account ownership. - Business ownership share. - Valuation
timestamp and source. - Reporting-period boundaries. - Treatment of
pending and cleared records. - Historical correction policy.

Use decimal-safe arithmetic for financial values. Avoid binary
floating-point for persisted currency calculations.

### 29.2 Provenance

For imported, extracted or AI-assisted data, retain appropriate source
metadata: - Source type. - External reference, if available. - Import
timestamp. - Extraction or parser version. - User confirmation status. -
Confidence or uncertainty. - Link to original record where retention
permits.

### 29.3 Forecast and scenario separation

Forecasts and scenarios are not actual transactions. Store them
separately and make their status explicit in the UI and API.

---

# PART VII --- UX AND PRODUCT DESIGN

## 30. User experience requirements

### 30.1 AI Copilot interface

Suggested interface elements: - Floating or persistent entry point. -
Full chat panel or dedicated assistant page. - Suggested example
questions. - Conversation history. - Streaming or clear progress
indicator. - Source-backed financial answers. - Tool activity
indicators. - Structured action previews. - Confirm and cancel
controls. - Clear error and fallback states.

Do not make the assistant obscure normal navigation or essential page
actions.

### 30.2 Smart-entry interface

Support: - Paste M-Pesa SMS. - Type a natural-language transaction. -
Upload a supported receipt or statement. - Review extracted fields. -
Correct uncertain fields. - Detect possible duplicates. - Confirm before
saving.

### 30.3 Insight interface

Every insight should answer: - What happened? - Compared with what? -
Why might it have happened? - Which records support it? - What can the
user do? - How confident is the system?

### 30.4 Forecast interface

Show: - Actual values. - Projected values. - Forecast period. -
Assumptions. - Uncertainty. - Main drivers. - Last-updated time.

Use clear visual distinction between actual and projected data.

### 30.5 Accessibility and responsive design

- Support keyboard navigation.
- Label controls clearly.
- Use accessible contrast.
- Avoid communicating status through color alone.
- Ensure tables and charts have useful text alternatives.
- Make key workflows usable on mobile.

---

# PART VIII --- TESTING AND QUALITY

## 31. Product-level testing checklist

### Financial correctness

- Income and expense totals.
- Transfers.
- Refunds and reversals.
- Multi-currency conversion.
- Net worth.
- Business ownership and consolidation.
- Investment contributions and returns.
- Debt schedules.
- Budget periods.

### AI correctness

- Structured output validation.
- Missing or ambiguous fields.
- Hallucinated references.
- Incorrect dates.
- Multiple amounts in source text.
- Malformed inputs.
- Prompt injection.
- Tool selection.
- Tool argument validation.
- Unsupported questions.
- Confirmation handling.

### Security

- Cross-user access attempts.
- Cross-business access attempts.
- Unauthorized action execution.
- Forged confirmation attempts.
- File access controls.
- Secret exposure.
- Rate-limit bypass.
- Malicious uploaded content.

### Reliability

- Provider timeout.
- Provider outage.
- Database failure.
- Background job retry.
- Duplicate job execution.
- Partial import failure.
- Repeated action request.
- Feature flag disabled.

### UX

- Empty states.
- Loading states.
- Error states.
- Mobile layouts.
- Keyboard access.
- Confirmation clarity.
- User correction flow.

## 32. Evaluation metrics

Measure product outcomes rather than counting AI calls.

Area Suggested metric

---

M-Pesa parsing Field-level extraction accuracy
Smart entry Time to create a confirmed transaction
Categorization Correct category rate and correction rate
Copilot Answer groundedness and task completion
Tool use Correct tool selection and validation rate
Forecasting Error by horizon
Alerts Useful-alert rate and dismissal rate
Reconciliation Match precision and unresolved discrepancy rate
OCR Field-level extraction accuracy
Cost Cost per successful user task
Reliability Error rate and latency
Trust User correction, cancellation and complaint rates

Set numeric targets only after establishing a baseline from
representative data.

---

# PART IX --- DELIVERY AND OPERATIONS

## 33. Suggested delivery workflow

For each feature:

1.  Write a feature brief.
2.  Confirm the user problem.
3.  Audit existing implementation.
4.  Define data and API contracts.
5.  Define authorization and threat model.
6.  Define acceptance criteria.
7.  Implement deterministic domain logic first.
8.  Add AI orchestration only where it adds value.
9.  Add unit and integration tests.
10. Add UI and error states.
11. Test in staging.
12. Run evaluation datasets if AI is involved.
13. Release behind a feature flag.
14. Monitor usage, cost and errors.
15. Collect user feedback.
16. Update documentation.

### 33.1 Suggested release strategy

- Development: mocked AI responses and test data.
- Staging: controlled real-provider testing.
- Production: feature-flagged rollout to a small audience.
- Expansion: increase availability after quality and cost review.

### 33.2 Operational dashboards

Monitor: - AI request volume. - Success and failure rates. - Latency. -
Token usage. - Estimated provider cost. - Rate-limit events. - Parsing
correction rates. - Action confirmation and cancellation rates. -
Forecast accuracy. - Background job failures.

---

# PART X --- PROJECT MANAGEMENT REFERENCE

## 34. Recommended documentation structure

Keep this document as the master product reference. As implementation
grows, split detailed engineering plans into smaller documents.

Suggested structure:

```text
docs/
├── README.md
├── product/
│   ├── trellisflow-master-roadmap.md
│   ├── feature-inventory.md
│   ├── product-principles.md
│   └── user-personas-and-workflows.md
├── architecture/
│   ├── system-architecture.md
│   ├── financial-data-model.md
│   ├── ai-architecture.md
│   └── security-and-privacy.md
├── ai/
│   ├── wave-2-5-ai-design.md
│   ├── mpesa-parsing.md
│   ├── financial-copilot.md
│   ├── rag-knowledge-assistant.md
│   └── ai-evaluation-strategy.md
├── features/
│   ├── financial-intelligence.md
│   ├── predictive-intelligence.md
│   ├── investment-intelligence.md
│   ├── business-intelligence.md
│   └── financial-command-centre.md
└── delivery/
    ├── implementation-backlog.md
    ├── release-checklist.md
    └── testing-strategy.md
```

This is a suggested structure. Do not move or rename existing files
until the current `docs/` contents have been reviewed.

## 35. Feature specification template

Use this template for each feature before implementation.

```md
# Feature name

## Status

Proposed / Planned / In Progress / Implemented / Deprecated

## Priority

P0 / P1 / P2 / P3

## Problem

What user problem does this solve?

## User value

What becomes easier, faster or more useful?

## User stories

- As a user, I want...

## Scope

What is included?

## Out of scope

What is explicitly excluded?

## Data requirements

What records and fields are needed?

## Backend

Services, APIs, jobs and permissions.

## Frontend

Pages, components, states and interactions.

## AI involvement

Why AI is needed, if at all.

## Security and privacy

Threats, access rules and retention.

## Dependencies

What must exist first?

## Acceptance criteria

Observable conditions for completion.

## Tests

Unit, integration, E2E and evaluation cases.

## Rollout

Feature flag, monitoring and fallback.

## Open questions

Unresolved product or technical decisions.
```

## 36. Definition of done

A feature is not complete merely because its main screen renders.

A feature is complete when: - Its user problem and scope are
documented. - Its data model and API contracts are reviewed. -
Authorization is enforced server-side. - Financial calculations are
tested. - Loading, empty and error states exist. - Accessibility and
responsive behaviour are considered. - Audit requirements are met. - AI
output is validated where applicable. - Fallback behaviour works. -
Documentation is updated. - Staging verification is complete. -
Monitoring is available. - Product acceptance criteria pass.

---

# PART XI --- OPEN DECISIONS

## 37. Questions to resolve before implementation

These decisions materially affect scope and architecture.

### Product

1.  Is TrellisFlow primarily for individuals, business owners,
    households or all three?
2.  Which user segment should receive the best experience first?
3.  Is the product intended to remain a personal wealth-management tool
    or eventually support advisors and teams?
4.  Which capabilities are essential for the first public AI release?

### Geography and currency

5.  Is Kenya the first primary market?
6.  Should KES be the default base currency?
7.  Which M-Pesa message and statement formats must be supported?
8.  Which other currencies and financial institutions are in scope?

### AI

9.  Resolved: Anthropic Claude is the initial provider, isolated behind the internal AI provider abstraction. The model remains environment-configurable.
10. What monthly AI budget is acceptable?
11. Should the copilot be available to all users or only selected plans?
12. How much conversation history should be retained?
13. Which actions may the assistant prepare, and which may it execute
    after confirmation?

### Data and privacy

14. What document-retention policy should apply to receipts and
    statements?
15. Which third-party data providers are acceptable?
16. What are the user's data export and deletion expectations?
17. What household or multi-user sharing model is required?

### Delivery

18. What features are already implemented and production-ready?
19. What is the preferred release cadence?
20. What is the available development capacity?

---

# PART XII --- RECOMMENDED FIRST IMPLEMENTATION BACKLOG

## 38. Start here

Do not begin by implementing every feature in the catalogue. Start with
a short, dependency-aware sequence.

### Sprint 0 --- Audit

- [ ] Inspect the repository and current documentation.
- [ ] Build the existing feature inventory.
- [ ] Verify database and API capabilities.
- [ ] Map existing features to this roadmap.
- [ ] Identify correctness and security gaps.
- [ ] Confirm initial target user and release scope.

### Sprint 1 --- Financial intelligence foundation

- [ ] Verify transaction and balance calculations.
- [ ] Verify transfer and refund treatment.
- [ ] Implement or improve spending analysis.
- [ ] Add traceability from insights to transactions.
- [ ] Add duplicate detection design and tests.

### Sprint 2 --- First predictive capability

- [ ] Define recurring transaction representation.
- [ ] Build basic goal completion forecasting.
- [ ] Define cash-flow forecast inputs.
- [ ] Add forecast assumptions and actual-versus-projected
      presentation.

### Sprint 3 --- AI infrastructure and M-Pesa parsing

- [x] Select the initial provider (Anthropic Claude) and isolate it behind a provider abstraction.
- [x] Add server-side provider configuration and feature flags.
- [x] Add Zod extraction validation schemas.
- [x] Implement authenticated SMS and receipt-image parse endpoint.
- [x] Build review and explicit confirmation UI using the existing transaction service.
- [x] Verify extraction does not automatically create transactions; add unit tests.
- [x] Add an initial endpoint rate limit and safe usage event logging.
- [x] Add durable provider token metering, optional configurable cost estimates, and an atomic per-user daily quota (20 UTC-day requests by default).
- [x] Build synthetic golden parsing fixtures and deterministic review-before-save tests.
- [ ] Evaluate live Anthropic extraction accuracy against representative Safaricom SMS and receipt fixtures.
- [ ] Complete manual UI verification and production provider/privacy review.

### Sprint 4 --- Read-only copilot

- [ ] Implement approved financial query tools.
- [ ] Enforce authenticated user scoping.
- [ ] Add spending, budget and goal queries.
- [ ] Build chat UI.
- [ ] Add source-backed answers and failure states.
- [ ] Test unsupported and malicious requests.

### Sprint 5 --- Controlled actions

- [ ] Add structured action previews.
- [ ] Add explicit confirmation.
- [ ] Add idempotency and audit logging.
- [ ] Implement transaction and budget actions.
- [ ] Test cancellation, retries and duplicate submissions.

The sprint names are planning units, not fixed time estimates. Estimate
effort after the codebase audit.

---

## 39. Final product direction

TrellisFlow should become a platform that connects financial records
with understanding, planning and carefully controlled action.

The long-term experience should allow a user to:

1.  See their complete financial position.
2.  Understand where money comes from and where it goes.
3.  Track investments and business performance.
4.  Anticipate obligations and cash-flow problems.
5.  Explore financial decisions before making them.
6.  Receive relevant, explainable recommendations.
7.  Ask questions in natural language.
8.  Reduce manual work through imports, extraction and automation.
9.  Approve actions without losing control.
10. Measure progress towards long-term wealth goals.

The differentiator will not be the number of AI features. It will be the
quality of the financial data, the usefulness of the intelligence, the
reliability of the calculations and the trust users have in the
platform.

**Build the financial foundation first, add intelligence where it
creates measurable value, and automate only when the system can do so
safely.**

---

## Appendix A --- Relationship to the earlier Wave 2.5 document

The original Wave 2.5 plan remains a useful detailed design reference
for: - M-Pesa parsing. - Transaction chatbot. - RAG site Q&A. - Insight
narration. - Vercel AI SDK integration. - Zod validation. - pgvector. -
Rate limits. - Cost logging. - Feature flags. - Prompt versioning. -
Testing and evaluation.

This master roadmap expands that initial AI plan into a wider product
strategy. Keep the original document as a more focused implementation
reference if it remains useful, and update it when provider or SDK
decisions are verified.

## Appendix B --- Glossary

---

Term Meaning

---

AI Copilot Conversational assistant that can
answer questions and prepare
approved actions

Agentic AI AI that can coordinate tools and
workflows under defined permissions

RAG Retrieval-augmented generation;
answering using retrieved reference
material

OCR Optical character recognition;
extracting text from images or
scanned documents

Structured output Model output constrained to a
defined schema

Tool calling Model requests a predefined backend
operation

Forecast Estimate of a future value based on
data and assumptions

Scenario Hypothetical calculation that does
not alter actual financial records

Idempotency A repeated request does not
accidentally create duplicate
effects

Provenance Information about where a record or
value originated

Feature flag Configuration that enables or
disables a capability without a
code redeployment

Evaluation dataset Representative examples used to
measure model or prompt quality

Tenant isolation Ensuring each user or organization
can access only authorized data
-----------------------------------------------------------------------

---
