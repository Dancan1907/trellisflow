# Read-only Money Copilot

## Scope

Money Copilot answers natural-language questions about a signed-in user's recorded TrellisFlow finances. Phase 1 is deliberately read-only: it has no transaction, transfer, account, budget, holding, or business mutation capability.

## API

- `POST /api/money-copilot/chat`
- JWT authentication is required.
- Request body: `{ "message": "How much did I spend this month?", "history": [] }`
- `message` is limited to 2,000 characters.
- Optional conversation history is limited to eight messages, with each message limited to 1,000 characters.
- Responses include `answer`, `readOnly: true`, and the local `asOf` date.

## Financial context

The backend builds the context for the authenticated user only:

- Latest saved net-worth snapshot, with its snapshot date and currency.
- Active account balances grouped by currency.
- Current-month income, expenses, and net cash flow, grouped by currency.
- Recent transaction descriptions and a bounded description-only transaction lookup.
- Expense category analysis for the current month, last 7 days, last 30 days, previous month, or year-to-date.
- Open investment holdings, cost basis, current recorded value, and unrealized gain grouped by currency.
- Internal business profit and loss, net worth, and historical 90-day cash-runway estimate; external businesses use their latest saved summary.

PostgreSQL `DATE` filters are widened by one day and then filtered by ISO date keys to avoid the database-session-timezone boundary issue. Transfers are excluded from income and expense aggregates. Different currencies are never added together or converted.

## AI and privacy

The existing provider abstraction is used; the provider API key stays on the server. Backend calculations supply financial facts and Gemini (or the configured provider) explains them. Prompts, chat messages, and transaction details are not written to AI usage tables. Usage accounting stores provider/model, token counts, success status, and optional estimated cost only.

The request is authenticated, rate limited, and subject to a separate per-user daily quota. User message and history content are treated as untrusted input. The model receives only the authenticated user's bounded financial context and cannot execute arbitrary SQL or call write services.

## Configuration

```env
AI_MONEY_COPILOT_ENABLED=false
AI_MONEY_COPILOT_DAILY_LIMIT=20
```

Keep the feature disabled until a valid server-side AI provider key is configured and the feature is validated in a non-production environment. Enable it by setting `AI_MONEY_COPILOT_ENABLED=true` in the backend environment and restarting/redeploying the API. Increase the quota independently with `AI_MONEY_COPILOT_DAILY_LIMIT` (for example, 60); no database migration is needed because the existing usage feature column is a string.

## Known limitations

- No personal cash-flow forecast is provided. The product does not currently have a reliable deterministic forecast model to support one.
- Business runway is a historical 90-day burn-rate estimate, not a guaranteed forecast.
- Investment gain is unrealized (current recorded value less recorded cost basis), not realized investment performance.
- The latest net-worth snapshot can lag current account balances.
- Search of individual transactions matches description text only and returns a small bounded result set.
- Reporting currency is a preference only; no foreign-exchange conversion is performed.
