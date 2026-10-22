// ============================================================================
// Balance Service
// ============================================================================
// Centralized service for updating account balances.
// Every financial mutation (create, update, delete) MUST go through here.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Applies the effect of a transaction to an account's cached balance.
   *
   * @param tx The Prisma transaction client (so it can be rolled back if needed)
   * @param accountId The account being affected
   * @param type INCOME, EXPENSE, or TRANSFER
   * @param amount The positive amount of the transaction
   * @param direction 1 to apply the transaction, -1 to reverse it (for updates/deletes)
   */
  async applyTransactionEffect(
    tx: any,
    accountId: string,
    type: TransactionType,
    amount: number,
    direction: 1 | -1 = 1,
  ) {
    // Determine the delta based on the transaction type
    let delta = 0;

    if (type === 'INCOME') {
      // Income adds to the balance
      delta = amount * direction;
    } else if (type === 'EXPENSE') {
      // Expense subtracts from the balance
      delta = -amount * direction;
    } else if (type === 'TRANSFER') {
      // Transfers are handled differently (depends on whether it's the from/to account)
      // The caller must pass direction explicitly for transfers.
      // A transfer OUT subtracts (direction = 1), a transfer IN adds (direction = 1 with a positive amount).
      delta = amount * direction;
    }

    // Update the account's cached balance
    await tx.account.update({
      where: { id: accountId },
      data: {
        currentBalance: {
          increment: delta,
        },
      },
    });

    this.logger.debug(`Applied balance delta of ${delta} to account ${accountId}`);
  }

  /**
   * Recomputes an account's balance from scratch based on its transactions.
   * Used by the nightly job to repair any drift.
   */
  async recomputeFromTransactions(accountId: string) {
    // Fetch the account (to know its category: ASSET or LIABILITY)
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Fetch all non-deleted transactions for this account
    const transactions = await this.prisma.transaction.findMany({
      where: { accountId, deletedAt: null },
    });

    // Compute the true balance
    let balance = 0;
    for (const tx of transactions) {
      const amount = Number(tx.amount);
      if (tx.type === 'INCOME') {
        balance += amount;
      } else if (tx.type === 'EXPENSE') {
        balance -= amount;
      } else if (tx.type === 'TRANSFER') {
        // Transfers store the sign in the amount field (positive for IN, negative for OUT)
        // depending on how they were recorded. We'll standardise this in the Transfer logic.
        balance += amount;
      }
    }

    // Update the cached balance
    await this.prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: balance },
    });

    return balance;
  }
}
