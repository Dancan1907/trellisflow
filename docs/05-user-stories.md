# 05 — User Stories

## What This Chapter Is

The full list of user stories — "As a user, I can…" — organized by domain. Every feature in TrellisFlow traces back to at least one story here.

**Total: 75 stories across 11 sections.**

## Section A — Account & Onboarding

- **A1.** As a visitor, I can sign up with email + password, so I get my own isolated world.
- **A2.** As a new user, I answer one persona-hint question, so TrellisFlow pre-activates the containers I likely need.
- **A3.** As a new user, I get a Personal container automatically, so my dashboard isn't empty.
- **A4.** As a user, I can log in, so I access my financial world.
- **A5.** As a user, I can reset my password via email, so I can recover access.
- **A6.** As a user, I can set my timezone and reporting currency, so my data displays correctly.
- **A7.** As a user, I can upgrade/downgrade my tier, so I can access more features or reduce cost.

## Section B — Personal Container

- **B1.** As a user, I can create/edit/archive accounts (asset or liability), so my money has a home.
- **B2.** As a user, I can record a transaction (income, expense, transfer), so my money movement is tracked.
- **B3.** As a user, I can record a transfer between two accounts, so money movement is complete.
- **B4.** As a user, I can categorize transactions, so I can analyze spending.
- **B5.** As a user, I can create/edit/nest/delete categories, so my analysis fits my life.
- **B6.** As a user, I can set up a recurring transaction (salary, rent, subscription), so I don't re-enter it.
- **B7.** As a user, I can modify a recurring transaction (this / future / all), so I stay in control.
- **B8.** As a user, I can see my Personal net worth, so I know where I stand.
- **B9.** As a user, I can see this month's Personal cash flow, so I know how I'm doing this month.

## Section C — Investments Container

- **C1.** As a user, I can create/edit/archive investment accounts (Robinhood, Binance, 401k), so my holdings are organized.
- **C2.** As a user, I can add/edit/delete a holding, so my portfolio is tracked.
- **C3.** As a user, I can record buy/sell/dividend/contribution/withdrawal events, so my positions stay accurate.
- **C4.** As a user, I can see unrealized gains/losses, so I know how my portfolio is doing.
- **C5.** As a user, I can see realized gains/losses (income), so I know what I've actually earned.
- **C6.** As a user, I can enable auto-pricing for stocks/ETFs/crypto, so prices stay current.
- **C7.** As a user, I can see my allocation across asset classes, so I can rebalance.
- **C8.** As a user, I can see performance over time, so I can judge my strategy.

## Section D — Internal Business Container

- **D1.** As a user, I can create/edit/archive a business, so I can track its money.
- **D2.** As a user, I can add accounts to a business, so its money has a home.
- **D3.** As a user, I can record business transactions, so its activity is tracked.
- **D4.** As a user, I can create business-specific categories, so its analysis is meaningful.
- **D5.** As a user, I can record an owner's draw OR salary when moving money out, so the nature of the withdrawal is clear.
- **D6.** As a user, I can see business P&L for a period, so I know if it's profitable.
- **D7.** As a user, I can see business net worth, so I know what the business is worth.
- **D8.** As a user, I can see business cash runway, so I know how many months of expenses it can cover.
- **D9.** As a user, I can convert an internal business to external, so I keep history when I build its own site.

## Section E — External Business Container

- **E1.** As a user, I can create/edit/archive an external business, so I can track its summary.
- **E2.** As a user, I can enter a summary manually, so I don't need an integration to start.
- **E3.** As a user, I can optionally tag a summary with a unit (e.g., Farm #47), so I can organize internally.
- **E4.** As a user, I can generate a rotating API token per business, so its site can push summaries.
- **E5.** As a user, I can see when a summary was last updated, so I know if data is stale.
- **E6.** As a user, I can view summary history (append-only), so I can see trends.
- **E7.** As a user, I can correct a past summary, preserving a version history, so mistakes don't corrupt data.
- **E8.** As a user, I can revoke or rotate an API token, so I stay secure.

## Section F — Universal Layer

- **F1.** As a user, I see my total net worth (all containers combined), so I see my whole picture.
- **F2.** As a user, I see my total monthly cash flow, so I see my momentum.
- **F3.** As a user, I see a breakdown of net worth by container, so I see composition.
- **F4.** As a user, I see a trend line of net worth over time, so I see growth.
- **F5.** As a user, I see insights (rules-based), so I have next actions.
- **F6.** As a user, I can view reports (net worth over time, cash flow, allocation, P&L), so I can analyze.
- **F7.** As a user, I can search/filter transactions across all containers, so I can find things.
- **F8.** As a user, I can switch between year/month/day views, so history is organized.
- **F9.** As a user, I can archive a container, so I can retire something without losing history.
- **F10.** As a user, I can permanently delete a container (buried), so I can remove data if I choose.
- **F11.** As a user, I can print/PDF export reports, so I have a physical record.

## Section G — System-Level

- **G1.** As a user, I can see an audit trail of changes, so I know what happened.
- **G2.** As a user, I receive reminders when a token is about to expire, so integrations don't break silently.
- **G3.** As a user, I see warnings when a business summary is stale, so I can update it.
- **G4.** As a user, I get tier limit warnings, so I'm never surprised.

## Section H — Non-functional

- **H1.** As a user, my data is isolated from all other users (multi-tenancy).
- **H2.** As a user, my passwords and tokens are hashed, never stored plain.
- **H3.** As a user, I can export my data, so I'm never locked in.
- **H4.** As a user, I can delete my account (soft + hard), so I control my data.
- **H5.** As a user, the app works on mobile web, so I can use it anywhere.
- **H6.** As a user, I can import CSV from banks (future).
- **H7.** As a user, I have a mobile app (future).
- **H8.** As a user, I can receive SMS/WhatsApp notifications (won't implement).

## Section I — Budgets

- **I1.** As a user, I can set a monthly budget per category, so I have a target to hit.
- **I2.** As a user, I can see progress against each budget, so I know where I stand.
- **I3.** As a user, I can see remaining amount per budget, so I know what's safe to spend.
- **I4.** As a user, I can enable rollover on a budget, so unused money carries forward.
- **I5.** As a user, I receive alerts when I'm approaching a budget limit, so I can adjust.
- **I6.** As a user, I can see a Budget vs. Actual report, so I can reflect on my habits.
- **I7.** As a user, I can copy the previous month's budgets, so I don't re-enter them.
- **I8.** As a user, I can set budgets on a business container too, so I can control business spending.
- **I9.** As a user, I can choose the budget method (simple monthly target / envelope), so it fits how I think.
- **I10.** As a user, I can see unbudgeted spending, so I know what's outside my plan.

## Section J — Savings Goals

- **J1.** As a user, I can create/edit/archive a savings goal.
- **J2.** As a user, I can link a goal to an account.
- **J3.** As a user, I can see progress toward a goal.
- **J4.** As a user, I can see projected completion date.
- **J5.** As a user, I get alerts as goal milestones are reached.

## Section K — Debt Payoff Planner

- **K1.** As a user, I can create a payoff plan for a liability account.
- **K2.** As a user, I can choose snowball or avalanche method.
- **K3.** As a user, I can see projected payoff date.
- **K4.** As a user, I can see interest saved vs. minimum payments.
- **K5.** As a user, I get alerts as debts are paid off.

## Story Status Legend

- **MVP** — must-have for Wave 1–5
- **Should-have** — planned for Wave 5 or later
- **Could-have** — Wave 6 or beyond
- **Won't-have** — explicitly excluded

Every story is either built, planned, or deferred. Nothing is ambiguous.
