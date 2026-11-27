import { BadRequestException } from '@nestjs/common';
import { NaturalLanguageDraftsService } from './natural-language-drafts.service';

describe('NaturalLanguageDraftsService confirmation', () => {
  const config = { get: jest.fn().mockReturnValue('true') };
  const aiProvider = { generate: jest.fn() };
  const prisma = {
    account: { findFirst: jest.fn() },
    category: { findFirst: jest.fn() },
  };
  const aiUsage = {};
  const transactions = {
    create: jest.fn(),
    transfer: jest.fn(),
  };
  let service: NaturalLanguageDraftsService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('true');
    prisma.account.findFirst.mockResolvedValue({
      id: 'account-1', containerId: 'container-1', currency: 'KES',
    });
    prisma.category.findFirst.mockResolvedValue({
      id: 'category-1', containerId: 'container-1',
    });
    transactions.create.mockResolvedValue({ id: 'transaction-1' });
    transactions.transfer.mockResolvedValue({ outTx: { id: 'out' }, inTx: { id: 'in' } });
    service = new NaturalLanguageDraftsService(
      aiProvider as any,
      config as any,
      prisma as any,
      aiUsage as any,
      transactions as any,
    );
  });

  it('validates ownership and forwards the idempotency key to the transaction writer', async () => {
    const result = await service.confirm('user-1', {
      idempotencyKey: '00000000-0000-4000-8000-000000000123',
      type: 'EXPENSE',
      transaction: {
        type: 'EXPENSE', amount: 120, date: '2026-11-27',
        description: 'Lunch', accountId: 'account-1', categoryId: 'category-1',
      },
    } as any);

    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: { id: 'account-1', userId: 'user-1', status: 'ACTIVE' },
      select: { id: true, containerId: true, currency: true },
    });
    expect(prisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: 'category-1', userId: 'user-1', status: 'ACTIVE', type: 'EXPENSE' },
      select: { id: true, containerId: true },
    });
    expect(transactions.create).toHaveBeenCalledWith('user-1', expect.objectContaining({
      type: 'EXPENSE', accountId: 'account-1', idempotencyKey: '00000000-0000-4000-8000-000000000123',
    }), 'MANUAL');
    expect(result).toEqual({ id: 'transaction-1' });
  });

  it('forwards the same idempotency key through transfer confirmation', async () => {
    const result = await service.confirm('user-1', {
      idempotencyKey: '00000000-0000-4000-8000-000000000123',
      type: 'TRANSFER',
      transaction: {
        fromAccountId: 'from-1', toAccountId: 'to-1', amount: 50,
        date: '2026-11-27', description: 'Savings transfer',
      },
    } as any);

    expect(transactions.transfer).toHaveBeenCalledWith('user-1', expect.objectContaining({
      fromAccountId: 'from-1', toAccountId: 'to-1',
      idempotencyKey: '00000000-0000-4000-8000-000000000123',
    }));
    expect(result).toEqual({ outTx: { id: 'out' }, inTx: { id: 'in' } });
  });

  it('rejects a mismatched transaction type before writing', async () => {
    await expect(service.confirm('user-1', {
      idempotencyKey: '00000000-0000-4000-8000-000000000123',
      type: 'EXPENSE',
      transaction: {
        type: 'INCOME', amount: 10, date: '2026-11-27',
        description: 'Unexpected income', accountId: 'account-1',
      },
    } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(transactions.create).not.toHaveBeenCalled();
  });
});
