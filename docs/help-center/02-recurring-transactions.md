---
title: Recurring transactions
route: /personal
visibility: authenticated
---

# Recurring transactions

Recurring rules describe transactions that repeat on a schedule, such as rent, salary or subscriptions.

## Creating a recurring rule

Open **Personal** (`/personal`) and locate the recurring transaction controls. Configure the transaction details and schedule, including:
- Income or expense type, or a transfer between accounts.
- Amount and currency.
- Source account and, for a transfer, destination account.
- Frequency and next occurrence.
- Optional intended day of month or day of week.
- Optional end date.

Review the next occurrence before saving. The selected frequency controls how future dates are calculated.

## Supported schedules

TrellisFlow supports daily, weekly, biweekly, monthly, quarterly and yearly schedules. Monthly, quarterly and yearly schedules preserve the intended calendar day when possible. If a month does not contain that day, the occurrence is placed on that month's final day; later months return to the intended day when possible.

Custom recurrence is not projected by the cash-flow forecast unless a deterministic custom schedule is supported by the rule.

## Pausing or ending a rule

Paused, ended and deleted rules are not treated as active future schedules by the cash-flow forecast. Review the rule status when a recurring item is unexpectedly missing from a projection.

## Recurring transfers

A recurring transfer moves money between two distinct accounts in the same container and currency. It is represented by paired outgoing and incoming movements, not by income and expense.

## Forecast interaction

The cash-flow forecast projects active recurring rules as scheduled movements. It avoids counting recurring transactions twice when they already exist in the historical transaction ledger.
