import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { PrismaService } from '../../prisma/prisma.service';

const createdAt = new Date('2026-11-18T00:00:00.000Z');

const profile = {
  id: 'profile-1',
  containerId: 'biz-1',
  businessType: 'RETAIL',
  businessTypeCustom: null,
  startDate: null,
  notes: null,
  logoUrl: null,
  createdAt,
  updatedAt: createdAt,
};

function account(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acc-1',
    userId: 'user-1',
    containerId: 'biz-1',
    name: 'Business Checking',
    category: 'ASSET',
    accountType: 'CHECKING',
    currency: 'KES',
    currentBalance: '1000',
    institution: null,
    notes: null,
    status: 'ACTIVE',
    archivedAt: null,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function container(overrides: Record<string, unknown> = {}) {
  return {
    id: 'biz-1',
    userId: 'user-1',
    type: 'INTERNAL_BUSINESS',
    name: 'Corner Shop',
    currency: 'KES',
    status: 'ACTIVE',
    archivedAt: null,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
    businessProfile: profile,
    externalSource: null,
    summaries: [],
    _count: { summaries: 0 },
    accounts: [account(), account({ id: 'acc-2', category: 'LIABILITY', currentBalance: '500' })],
    ...overrides,
  };
}

const mockPrisma = {
  container: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  businessProfile: {
    updateMany: jest.fn(),
  },
  transaction: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('BusinessesService (Unit)', () => {
  let service: BusinessesService;

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BusinessesService>(BusinessesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('returns each business with its profile and computed net worth', async () => {
      mockPrisma.container.findMany.mockResolvedValue([container()]);

      const [business] = await service.findAll('user-1');

      expect(business).toBeDefined();
      expect(business!.name).toBe('Corner Shop');
      expect(business!.businessProfile).toEqual(profile);
      expect(business!.accountCount).toBe(2);
      expect(business!.netWorth).toEqual({
        totalAssets: 1000,
        totalLiabilities: 500,
        netWorth: 500,
        currency: 'KES',
      });
    });
  });

  describe('findOne', () => {
    it('returns the accounts alongside the summary', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());

      const result = await service.findOne('user-1', 'biz-1');

      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0]?.currentBalance).toBe(1000);
      expect(mockPrisma.container.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'biz-1',
            userId: 'user-1',
            type: { in: ['INTERNAL_BUSINESS', 'EXTERNAL_BUSINESS'] },
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('throws NotFoundException for another user or a missing business', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-2', 'biz-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the container name and the profile fields', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());
      mockPrisma.container.update.mockResolvedValue(container());
      mockPrisma.businessProfile.updateMany.mockResolvedValue({ count: 1 });

      await service.update('user-1', 'biz-1', { name: 'New Name', businessType: 'FARMING' });

      expect(mockPrisma.container.update).toHaveBeenCalledWith({
        where: { id: 'biz-1' },
        data: { name: 'New Name' },
      });
      expect(mockPrisma.businessProfile.updateMany).toHaveBeenCalledWith({
        where: { containerId: 'biz-1' },
        data: { businessType: 'FARMING' },
      });
    });

    it('returns the current state without writing when the DTO is empty', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());

      const result = await service.update('user-1', 'biz-1', {});

      expect(result.id).toBe('biz-1');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the business does not belong to the user', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);

      await expect(service.update('user-2', 'biz-1', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('archive', () => {
    it('soft-deletes the container by setting status and archivedAt', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());
      mockPrisma.container.update.mockResolvedValue(container({ status: 'ARCHIVED' }));

      const result = await service.archive('user-1', 'biz-1');

      expect(result.status).toBe('ARCHIVED');
      expect(mockPrisma.container.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'biz-1' },
          data: expect.objectContaining({ status: 'ARCHIVED', archivedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('getNetWorth', () => {
    it('computes assets minus liabilities', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());

      const result = await service.getNetWorth('user-1', 'biz-1');

      expect(result).toEqual({
        businessId: 'biz-1',
        currency: 'KES',
        totalAssets: 1000,
        totalLiabilities: 500,
        netWorth: 500,
      });
    });
  });

  describe('getPnl', () => {
    it('totals income and expenses and groups them by category', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          type: 'INCOME',
          amount: '5000',
          currency: 'KES',
          date: new Date('2026-11-05'),
          category: { id: 'cat-1', name: 'Sales' },
        },
        {
          type: 'INCOME',
          amount: '1000',
          currency: 'KES',
          date: new Date('2026-11-15'),
          category: { id: 'cat-1', name: 'Sales' },
        },
        {
          type: 'EXPENSE',
          amount: '2000',
          currency: 'KES',
          date: new Date('2026-11-20'),
          category: { id: 'cat-2', name: 'Rent' },
        },
        { type: 'EXPENSE', amount: '500', currency: 'KES', date: new Date('2026-11-30'), category: null },
        // Rows inside the widened SQL window but outside the requested range.
        {
          type: 'INCOME',
          amount: '9999',
          currency: 'KES',
          date: new Date('2026-10-31'),
          category: { id: 'cat-1', name: 'Sales' },
        },
        {
          type: 'EXPENSE',
          amount: '9999',
          currency: 'KES',
          date: new Date('2026-12-01'),
          category: { id: 'cat-2', name: 'Rent' },
        },
      ]);

      const result = await service.getPnl('user-1', 'biz-1', {
        from: '2026-11-01',
        to: '2026-11-30',
      });

      expect(result.totalIncome).toBe(6000);
      expect(result.totalExpenses).toBe(2500);
      expect(result.netProfit).toBe(3500);
      expect(result.from).toBe('2026-11-01');
      expect(result.to).toBe('2026-11-30');
      expect(result.byCategory).toHaveLength(3);

      const sales = result.byCategory.find((row) => row.categoryName === 'Sales');
      expect(sales?.amount).toBe(6000);

      const uncategorized = result.byCategory.find((row) => row.categoryId === null);
      expect(uncategorized?.amount).toBe(500);

      // INCOME rows sort before EXPENSE rows.
      expect(result.byCategory[0]?.type).toBe('INCOME');
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['POSTED', 'RECONCILED'] } }),
      }));
    });

    it('keeps mixed-currency P&L totals separate', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          type: 'INCOME', amount: '1000', currency: 'KES',
          date: new Date('2026-11-10'), category: { id: 'kes-sales', name: 'Sales' },
        },
        {
          type: 'EXPENSE', amount: '200', currency: 'USD',
          date: new Date('2026-11-11'), category: { id: 'usd-rent', name: 'Rent' },
        },
      ]);

      const result = await service.getPnl('user-1', 'biz-1', {
        from: '2026-11-01', to: '2026-11-30',
      });

      expect(result.currency).toBe('KES');
      expect(result.totalIncome).toBe(1000);
      expect(result.totalExpenses).toBe(0);
      expect(result.byCurrency).toEqual(expect.arrayContaining([
        expect.objectContaining({ currency: 'KES', totalIncome: 1000, totalExpenses: 0, netProfit: 1000 }),
        expect.objectContaining({ currency: 'USD', totalIncome: 0, totalExpenses: 200, netProfit: -200 }),
      ]));
    });

    it('rejects a range whose start is after its end', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container());

      await expect(
        service.getPnl('user-1', 'biz-1', { from: '2026-11-30', to: '2026-11-01' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRunway', () => {
    const runwayContainer = () =>
      container({
        accounts: [
          account({ id: 'cash-1', accountType: 'CHECKING', currentBalance: '12000' }),
          account({
            id: 'inv-1',
            accountType: 'INVESTMENT_ACCOUNT',
            currentBalance: '50000',
          }),
          account({ id: 'loan-1', category: 'LIABILITY', currentBalance: '1000' }),
        ],
      });

    it('divides liquid cash by the average monthly burn', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(runwayContainer());
      mockPrisma.transaction.findMany.mockResolvedValue([{ amount: '6000', currency: 'KES', date: new Date() }]);

      const result = await service.getRunway('user-1', 'biz-1');

      expect(result.cashBalance).toBe(12000); // investment account excluded
      expect(result.monthlyBurn).toBe(2000); // 6000 over 90 days ≈ 3 months
      expect(result.runwayMonths).toBe(6);
      expect(result.windowDays).toBe(90);
      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ status: { in: ['POSTED', 'RECONCILED'] } }),
      }));
    });

    it('keeps cash balances and burn rates separate across currencies', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(container({
        accounts: [
          account({ id: 'kes-cash', currency: 'KES', currentBalance: '12000' }),
          account({ id: 'usd-cash', accountType: 'SAVINGS', currency: 'USD', currentBalance: '500' }),
        ],
      }));
      mockPrisma.transaction.findMany.mockResolvedValue([
        { amount: '6000', currency: 'KES', date: new Date() },
        { amount: '3000', currency: 'USD', date: new Date() },
      ]);

      const result = await service.getRunway('user-1', 'biz-1');

      expect(result.currency).toBe('KES');
      expect(result.cashBalance).toBe(12000);
      expect(result.monthlyBurn).toBe(2000);
      expect(result.runwayMonths).toBe(6);
      expect(result.byCurrency).toEqual(expect.arrayContaining([
        expect.objectContaining({ currency: 'KES', cashBalance: 12000, monthlyBurn: 2000, runwayMonths: 6 }),
        expect.objectContaining({ currency: 'USD', cashBalance: 500, monthlyBurn: 1000, runwayMonths: 0.5 }),
      ]));
    });

    it('returns null runway when the business has no expenses', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(runwayContainer());
      mockPrisma.transaction.findMany.mockResolvedValue([]);

      const result = await service.getRunway('user-1', 'biz-1');

      expect(result.monthlyBurn).toBe(0);
      expect(result.runwayMonths).toBeNull();
    });
  });
});
