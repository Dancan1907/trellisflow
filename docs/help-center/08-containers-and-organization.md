---
title: Containers and how TrellisFlow organizes money
route: /personal
visibility: authenticated
---

# Containers and how TrellisFlow organizes money

A container is a top-level grouping for related financial records. Accounts, transactions, categories, recurring rules, budgets and other records belong to a container. This keeps personal, investment and business activity organized while allowing TrellisFlow to provide a combined financial overview.

## The four container types

### Personal

Every user has one Personal container. It holds personal accounts such as checking, savings, cash, mobile money, credit cards and loans. Personal net worth is based on assets minus liabilities.

Open **Personal** (`/personal`) to manage personal accounts and transactions.

### Investments

The Investments container holds investment accounts and holdings, such as brokerage, crypto-exchange or retirement positions. Investment activity is represented through investment events such as buys, sells and dividends rather than treating every event as an ordinary personal expense.

Open **Investments** (`/investments`) to manage holdings and investment activity.

### Internal Business

An internal business is a business whose day-to-day financial records are maintained in TrellisFlow. It has its own accounts, transactions, business profile and business-specific categories. Business reporting can include profit and loss and business net worth.

Open **Businesses** (`/businesses`) to manage business records.

### External Business

An external business is operated in another system. TrellisFlow stores periodic financial summaries supplied manually or through a supported API integration rather than duplicating the external system's full transaction ledger.

## How containers relate to accounts

Every account belongs to exactly one container. Accounts also have their own currency, so a container can organize accounts without requiring every account to use the same currency.

Choose the correct container when creating or reviewing an account. This determines which financial area the account contributes to.

## Combined financial views

TrellisFlow can combine eligible container-level information into broader net-worth and cash-flow views. Transfers between a user's own accounts move money but do not represent new income or spending.

## Important ownership rule

Containers and their records are scoped to the owning user. The Help Assistant explains product organization but cannot view or disclose another user's records.
