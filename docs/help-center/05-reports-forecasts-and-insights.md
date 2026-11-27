---
title: Reports, cash-flow forecasts and insights
route: /reports
visibility: authenticated
---

# Reports, cash-flow forecasts and insights

## Reports

Open **Reports** (`/reports`) to review available summaries of your financial activity. Reports reflect the data and scope described by each report.

## Cash-flow forecast

Open **Reports → Cash-flow Forecast** (`/reports/cash-flow-forecast`) to view projected daily balances for eligible active liquid asset accounts.

The forecast uses current account balances, posted and reconciled transaction history, pending movements, active recurring rules and known future-dated transactions. It is deterministic: the AI model does not calculate forecast balances.

Each account is forecast in its own currency. Different currencies are not added together or converted. The initial version focuses on checking, savings, cash, mobile-money and prepaid accounts. Liability, investment and custom accounts are not treated as liquid cash accounts in this forecast.

The forecast includes:
- A configurable forecast horizon and historical lookback.
- Scenario adjustments to variable income and expenses.
- Projected daily balances and indicative uncertainty ranges.
- Warnings when a projected account balance falls below zero.
- Historical backtesting metrics where sufficient history exists.

The uncertainty range is a heuristic based on historical variability, not a probability guarantee. A forecast is an estimate based on recorded data and assumptions; it is not a promise of future cash availability.

## Insights

Open **Insights** (`/insights`) to review system-generated observations such as budget warnings, goal progress and other financial signals. Insights are based on the records available to TrellisFlow and may require review before you act on them.

## Interpreting differences

A report, forecast and account balance may use different dates, transaction statuses or scopes. Check the feature's assumptions and selected period before comparing figures.
