# Money Copilot

## Scope

Money Copilot answers natural-language questions about a signed-in user's recorded TrellisFlow finances. Its chat/data-analysis path is read-only. A separate, narrow action workflow supports previewing and explicitly confirming ordinary income and expense transactions. It does not expose arbitrary database queries or unrestricted financial mutations.

## API capabilities

- `POST /api/money-copilot/chat` — authenticated financial Q&A and supported deterministic what-if analysis.
- Action preview and confirmation endpoints are exposed by the Money Copilot controller; the action service supports income and expense transaction creation only. Chat, preview and confirmation all fail closed unless `AI_MONEY_COPILOT_ENABLED=true`.
- JWT authentication and throttling are required.
- Chat message is limited to 2,000 characters; optional conversation history is bounded.
- Action previews expire after 10 minutes and require explicit confirmation.

## Financial context

The backend builds context for the authenticated user only:

- Latest saved net-worth snapshot, with its snapshot date and reporting currency; the snapshot includes open investment holding values separately from linked investment-account cash. Other currencies remain in a separate breakdown and are never combined without FX conversion.
- Active account balances grouped by currency.
- Current-month income, expenses, and net cash flow, grouped by currency.
- Recent transaction descriptions and a bounded description-only transaction lookup.
- Expense category analysis for supported date ranges.
- Open investment holdings, cost basis, current recorded value, unrealized gain and return, allocation and concentration indicators grouped by currency; recorded realized sale gains/losses, dividend/interest income, contributions and withdrawals are reported separately by currency.
- Internal business net worth, profit and loss, and a historical 90-day cash-runway estimate, grouped by currency; external businesses use their latest saved summary.
- Supported deterministic what-if sensitivities for personal expense reduction, internal-business revenue/expense changes and uniform portfolio-value changes.

PostgreSQL `DATE` filters are widened and then filtered by ISO date keys to avoid database-session-timezone boundary issues. Transfers are excluded from income and expense aggregates. Different currencies are never added together or converted, including within a single business container.

## Confirmed transaction actions

The action workflow is deliberately constrained:

1. The user requests an income or expense action.
2. The API validates the active account and optional category against the authenticated user and account container.
3. The API stores a short-lived preview and canonical payload hash.
4. The user explicitly confirms the preview.
5. The API atomically claims the pending action, revalidates account/category state, creates the transaction, applies the balance effect, writes the audit event and stores the resulting transaction ID in one database transaction.
6. Repeated confirmation returns the existing transaction rather than repeating the financial write. If the initial snapshot refresh failed, a retry refreshes the snapshot without duplicating the transaction.

The shared transaction writer also accepts per-user idempotency keys for natural-language confirmations and paired transfers. A matching retry returns the original result; reusing a key with a different payload is rejected.

Transfers, account mutations, budget changes, holding changes and arbitrary actions are not supported by this action workflow. Use their dedicated application workflows.

## What-if limitations

What-if results are deterministic sensitivities, not forecasts or predictions. Supported scenario families are limited to those explicitly recognized by the service and backed by available data. They do not model probability, future behavior, tax, fees, inflation or market-return assumptions. Unsupported or ambiguous scenario requests must not be treated as calculated outcomes.

## AI and privacy

The existing provider abstraction is used; provider API keys stay on the server. Backend calculations supply financial facts and the configured provider explains them. Prompts, chat messages and transaction details are not written to AI usage tables. Usage accounting stores provider/model, token counts, success status and optional estimated cost only.

Requests are authenticated, rate limited and subject to per-user quotas. User messages, history and transaction descriptions are untrusted input. The model cannot execute arbitrary SQL or directly invoke write services. All supported financial writes pass through the explicit action preview/confirmation service.

## Configuration

```env
AI_MONEY_COPILOT_ENABLED=false
AI_MONEY_COPILOT_DAILY_LIMIT=20

# Web build-time navigation flag
NEXT_PUBLIC_MONEY_COPILOT_ENABLED=false
```

Keep the feature disabled until a valid server-side AI provider key is configured and the feature is validated in a non-production environment. Enable it by setting `AI_MONEY_COPILOT_ENABLED=true` in the backend environment and restarting/redeploying the API. Set `NEXT_PUBLIC_MONEY_COPILOT_ENABLED=true` in the web build environment and rebuild/redeploy the frontend to display the navigation entry. Configure quotas independently. Keep provider secrets exclusively in the backend environment.

## Known limitations

- Business runway is a historical 90-day burn-rate estimate, not a guaranteed forward forecast.
- Unrealized investment gain is based on recorded cost basis and current recorded value; it is not a time-weighted or money-weighted historical return series. Realized gains and dividend/interest income are available only when their investment events have been explicitly recorded; contributions and withdrawals are not investment returns.
- Concentration indicators are descriptive. Volatility, beta, Sharpe ratio, maximum drawdown and correlation are unavailable without reliable historical market-price series.
- External businesses use saved summary data and do not have the same transaction-level analysis as internal businesses.
- The latest net-worth snapshot can lag current account balances. Its components are breakdowns, not additional wealth to sum again.
- Search of individual transactions matches description text only and returns a small bounded result set.
- Reporting currency is a preference only; no foreign-exchange conversion is performed.
- What-if simulations cover only the supported scenario families and are not probability-weighted forecasts.
- Confirmed writes are limited to income and expense transactions; transfers and other mutations remain in their dedicated workflows.
