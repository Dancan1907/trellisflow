---
title: Accounts and transactions
route: /personal
visibility: authenticated
---

# Accounts and transactions

## Accounts

Accounts represent places where money is held or owed, such as cash, bank accounts, mobile-money wallets, credit cards or loans. Accounts belong to a financial container and have a currency and account type.

To manage accounts, open **Personal** (`/personal`) and use the account controls available in the relevant container. Create an account with its name, category, account type, currency and opening balance. Choose the correct asset or liability classification.

An account's current balance is a recorded balance, not a live connection to your bank unless a connected integration explicitly provides synchronization.

## Transactions

Transactions record income, expenses or transfers against an account. Open **Personal** and select the transaction workflow.

When recording a transaction, check:
- Transaction type (income, expense or transfer).
- Amount and currency.
- Effective transaction date.
- Account.
- Category, where applicable.
- A clear description.

A transaction's effective date may differ from the date it was entered. Pending, posted and reconciled statuses have different meanings in the ledger.

## Transfers

A transfer moves money between two accounts. It should not be treated as income or an expense in spending analysis. Use the transfer workflow and select both the source and destination accounts. The two sides should represent the same movement and currency.

## Categories

Categories help group income and expenses for budgets and reports. Choose a category that describes the transaction's purpose. Category availability can depend on the selected container and transaction type.

## Editing records

Review the date, amount, currency and account before saving. Correct mistakes by editing the original record through the application's transaction workflow rather than creating a second transaction to offset it, unless that is the intended accounting treatment.

## AI-assisted transaction drafts

When enabled, natural-language transaction entry can interpret a sentence describing an income, expense or transfer and prepare a draft. M-Pesa message parsing can also extract transaction details from text you provide. These tools do not save a transaction automatically.

Review and correct the transaction type, amount, date, description, account, category and (for transfers) source and destination accounts. Confirm only when the details are accurate. A repeated confirmation retry with the same idempotency key and payload is protected against duplicate financial writes. Reusing a key with a different payload is rejected.

Never paste passwords, provider keys, authentication tokens or other secrets into a parsing or AI workflow.
