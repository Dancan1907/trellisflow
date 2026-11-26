import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CashFlowForecastingService } from './cash-flow-forecasting.service';

const prisma = {
  account: { findMany: jest.fn() },
  recurringRule: { findMany: jest.fn() },
  transaction: { findMany: jest.fn() },
};

describe('CashFlowForecastingService', () => {
  let service: CashFlowForecastingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowForecastingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(CashFlowForecastingService);
    prisma.account.findMany.mockResolvedValue([
      { id: 'a1', name: 'Wallet', currency: 'KES', currentBalance: { toString: () => '1000.00' } },
    ]);
    prisma.recurringRule.findMany.mockResolvedValue([]);
    prisma.transaction.findMany.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  it('scopes all financial reads to the authenticated user', async () => {
    await service.forecast('user-1', { horizonDays: 30, historyDays: 90 });
    expect(prisma.account.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE', category: 'ASSET' }),
    }));
    expect(prisma.recurringRule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-1', status: 'ACTIVE' }),
    }));
    expect(prisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'user-1',
        deletedAt: null,
        date: expect.objectContaining({ gte: expect.any(Date) }),
        status: { in: ['POSTED', 'RECONCILED', 'PENDING'] },
      }),
    }));
    const transactionQuery = prisma.transaction.findMany.mock.calls[0]![0];
    expect(transactionQuery.where.date).not.toHaveProperty('lte');
  });

  it('returns forecasts, backtesting and an explicit empty-rule scope', async () => {
    const result = await service.forecast('user-1', { horizonDays: 30, historyDays: 90 });
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0]!.openingBalance).toBe(1000);
    expect(result.scope).toEqual({
      accountCount: 1,
      recurringRuleCount: 0,
      transactionCount: 0,
      currencies: ['KES'],
    });
    expect(result.backtesting[0]!.currency).toBe('KES');
    expect(result.assumptions.length).toBeGreaterThan(0);
  });
});
