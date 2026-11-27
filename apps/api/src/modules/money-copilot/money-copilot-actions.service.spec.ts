import { BadRequestException, GoneException, NotFoundException } from '@nestjs/common';
import { MoneyCopilotActionsService } from './money-copilot-actions.service';

describe('MoneyCopilotActionsService', () => {
  const prisma: any = {
    account: { findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
    moneyCopilotAction: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    transaction: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const tx: any = {
    moneyCopilotAction: { updateMany: jest.fn(), update: jest.fn() },
    account: { findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
    transaction: { create: jest.fn() },
  };
  const balances = { applyTransactionEffect: jest.fn() };
  const audit = { log: jest.fn() };
  const snapshots = { computeAndSaveForUser: jest.fn() };
  let service: MoneyCopilotActionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MoneyCopilotActionsService(prisma, balances as any, audit as any, snapshots as any);
    prisma.account.findFirst.mockResolvedValue({
      id: 'account-1', name: 'Main account', currency: 'KES', containerId: 'container-1',
    });
    prisma.category.findFirst.mockResolvedValue({ id: 'category-1', name: 'Food' });
    prisma.moneyCopilotAction.create.mockResolvedValue({});
    tx.moneyCopilotAction.updateMany.mockResolvedValue({ count: 1 });
    tx.account.findFirst.mockResolvedValue({
      id: 'account-1', containerId: 'container-1', currency: 'KES',
    });
    tx.category.findFirst.mockResolvedValue({ id: 'category-1' });
    tx.transaction.create.mockResolvedValue({ id: 'transaction-1', amount: 100, type: 'EXPENSE' });
    tx.moneyCopilotAction.update.mockResolvedValue({});
    balances.applyTransactionEffect.mockResolvedValue(undefined);
    audit.log.mockResolvedValue(undefined);
    snapshots.computeAndSaveForUser.mockResolvedValue(undefined);
    prisma.$transaction.mockImplementation((callback: any) => callback(tx));
  });

  it('creates a user-scoped, expiring preview and exposes the exact details', async () => {
    const result = await service.preview('user-1', {
      type: 'EXPENSE', amount: 100, accountId: 'account-1', categoryId: 'category-1',
      date: '2026-11-27', description: ' Groceries ',
    });

    expect(result).toMatchObject({
      status: 'PENDING',
      requiresExplicitConfirmation: true,
      preview: {
        amount: 100, currency: 'KES', account: 'Main account',
        category: 'Food', description: 'Groceries', date: '2026-11-27',
      },
    });
    expect(result.actionId).toBeDefined();
    expect(prisma.moneyCopilotAction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user-1', idempotencyKey: result.actionId }),
    }));
  });

  it('rejects an account that does not belong to the authenticated user', async () => {
    prisma.account.findFirst.mockResolvedValue(null);
    await expect(service.preview('user-1', {
      type: 'EXPENSE', amount: 100, accountId: 'foreign-account',
      date: '2026-11-27', description: 'Groceries',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.moneyCopilotAction.create).not.toHaveBeenCalled();
  });

  it('rejects a category with the wrong transaction type or scope', async () => {
    prisma.category.findFirst.mockResolvedValue(null);
    await expect(service.preview('user-1', {
      type: 'EXPENSE', amount: 100, accountId: 'account-1', categoryId: 'income-category',
      date: '2026-11-27', description: 'Groceries',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('atomically confirms once, updates balance, audits and refreshes the snapshot', async () => {
    const payload = {
      type: 'EXPENSE', amount: 100, accountId: 'account-1', categoryId: 'category-1',
      date: '2026-11-27', description: 'Groceries',
    };
    const action = {
      id: 'action-1', userId: 'user-1', idempotencyKey: 'action-1',
      payload, payloadHash: require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
    };
    prisma.moneyCopilotAction.findFirst.mockResolvedValue(action);

    const result = await service.confirm('user-1', 'action-1');

    expect(result).toMatchObject({ status: 'CONFIRMED', replayed: false });
    expect(tx.moneyCopilotAction.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'action-1', userId: 'user-1', status: 'PENDING' }),
    }));
    expect(tx.transaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'user-1', idempotencyKey: 'action-1', amount: 100 }),
    }));
    expect(balances.applyTransactionEffect).toHaveBeenCalledWith(tx, 'account-1', 'EXPENSE', 100, 1);
    expect(audit.log).toHaveBeenCalled();
    expect(snapshots.computeAndSaveForUser).toHaveBeenCalledWith('user-1');
  });

  it('returns an already confirmed transaction on a retry without writing again', async () => {
    prisma.moneyCopilotAction.findFirst.mockResolvedValue({
      id: 'action-1', status: 'CONFIRMED', transactionId: 'transaction-1',
    });
    prisma.transaction.findFirst.mockResolvedValue({ id: 'transaction-1' });

    const result = await service.confirm('user-1', 'action-1');

    expect(result).toMatchObject({ status: 'CONFIRMED', replayed: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(balances.applyTransactionEffect).not.toHaveBeenCalled();
  });

  it('rejects an expired preview', async () => {
    prisma.moneyCopilotAction.findFirst.mockResolvedValue({
      id: 'action-1', status: 'PENDING', expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.confirm('user-1', 'action-1')).rejects.toBeInstanceOf(GoneException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not create a transaction when the atomic claim has already been taken', async () => {
    const payload = { type: 'EXPENSE', amount: 100, accountId: 'account-1', date: '2026-11-27', description: 'Groceries' };
    const action = {
      id: 'action-1', userId: 'user-1', idempotencyKey: 'action-1', payload,
      payloadHash: require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
      status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
    };
    prisma.moneyCopilotAction.findFirst.mockResolvedValue(action);
    tx.moneyCopilotAction.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.confirm('user-1', 'action-1')).rejects.toBeDefined();
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(balances.applyTransactionEffect).not.toHaveBeenCalled();
  });
});
