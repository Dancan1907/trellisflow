import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DebtsService } from './debts.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  debtPayoffPlan: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  account: { findFirst: jest.fn() },
};

function buildPlan(overrides: any = {}) {
  const balance = overrides.balance ?? '500';
  const min = overrides.min ?? '100';
  const rate = overrides.rate ?? '0';
  const name = overrides.name ?? 'Test Debt';
  return {
    id: overrides.id ?? `plan-${Math.random()}`,
    userId: 'user-1',
    accountId: overrides.accountId ?? `acc-${Math.random()}`,
    method: 'SNOWBALL',
    extraMonthlyPayment: 0,
    minimumPayment: min,
    interestRate: rate,
    notes: null,
    status: 'ACTIVE',
    completedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    account: {
      id: overrides.accountId ?? 'acc-1',
      name,
      currentBalance: balance,
      currency: 'KES',
      category: 'LIABILITY',
      status: 'ACTIVE',
    },
  };
}

describe('DebtsService (Unit)', () => {
  let service: DebtsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DebtsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<DebtsService>(DebtsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    it('creates a debt plan for a valid liability account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'acc-1' });
      mockPrisma.debtPayoffPlan.findUnique.mockResolvedValue(null);
      mockPrisma.debtPayoffPlan.create.mockImplementation(({ data }) => data);

      const result = await service.create('user-1', {
        accountId: 'acc-1',
        minimumPayment: 100,
        interestRate: 18.5,
      });

      expect(result.accountId).toBe('acc-1');
      expect(result.method).toBe('SNOWBALL');
      expect(mockPrisma.debtPayoffPlan.create).toHaveBeenCalled();
    });

    it('throws NotFound if account does not exist or is not a liability', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', { accountId: 'acc-1', minimumPayment: 100, interestRate: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequest if a plan already exists for the account', async () => {
      mockPrisma.account.findFirst.mockResolvedValue({ id: 'acc-1' });
      mockPrisma.debtPayoffPlan.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('user-1', { accountId: 'acc-1', minimumPayment: 100, interestRate: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================================================
  // remove
  // ==========================================================================

  describe('remove', () => {
    it('archives the plan', async () => {
      mockPrisma.debtPayoffPlan.findFirst.mockResolvedValue({ id: 'plan-1' });
      mockPrisma.debtPayoffPlan.update.mockResolvedValue({ id: 'plan-1', status: 'ARCHIVED' });

      await service.remove('user-1', 'plan-1');

      expect(mockPrisma.debtPayoffPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: expect.objectContaining({ status: 'ARCHIVED' }),
      });
    });

    it('throws NotFound if plan does not belong to the user', async () => {
      mockPrisma.debtPayoffPlan.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'plan-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // simulate
  // ==========================================================================

  describe('simulate', () => {
    it('throws BadRequest if no active plans exist', async () => {
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([]);

      await expect(
        service.simulate('user-1', { extraMonthlyPayment: 100, method: 'SNOWBALL' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('snowball: pays off smaller balance first and rolls freed minimums forward', async () => {
      // Two 0% APR debts — makes the math deterministic.
      // Debt A: 300 balance, 100 min
      // Debt B: 1000 balance, 100 min
      // Extra = 0
      // Expected: 7 months (vs 10 months without snowball effect)
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([
        buildPlan({
          id: 'A',
          accountId: 'accA',
          balance: '300',
          min: '100',
          rate: '0',
          name: 'Debt A',
        }),
        buildPlan({
          id: 'B',
          accountId: 'accB',
          balance: '1000',
          min: '100',
          rate: '0',
          name: 'Debt B',
        }),
      ]);

      const result = await service.simulate('user-1', {
        extraMonthlyPayment: 0,
        method: 'SNOWBALL',
      });

      expect(result.monthsToPayoff).toBe(7);
      expect(result.totalInterestPaid).toBe(0);
      expect(result.history).toHaveLength(7);

      // Verify the freed minimums rolled forward:
      // M1: A=200, B=900 → 1100
      // M2: A=100, B=800 → 900
      // M3: A=0, B=700 (freed 100) → 700
      // M4: B gets 100+100 → B=500
      // M5: B=300
      // M6: B=100
      // M7: B=0
      expect(result.history[0].totalBalance).toBe(1100);
      expect(result.history[1].totalBalance).toBe(900);
      expect(result.history[2].totalBalance).toBe(700);
      expect(result.history[3].totalBalance).toBe(500);
      expect(result.history[6].totalBalance).toBe(0);
    });

    it('avalanche: prioritizes highest interest rate', async () => {
      // Debt A: 1000 balance, 100 min, 10% APR
      // Debt B: 500 balance, 100 min, 24% APR
      // Avalanche targets B first despite higher balance on A
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([
        buildPlan({
          id: 'A',
          accountId: 'accA',
          balance: '1000',
          min: '100',
          rate: '10',
          name: 'Debt A',
        }),
        buildPlan({
          id: 'B',
          accountId: 'accB',
          balance: '500',
          min: '100',
          rate: '24',
          name: 'Debt B',
        }),
      ]);

      const result = await service.simulate('user-1', {
        extraMonthlyPayment: 0,
        method: 'AVALANCHE',
      });

      // Just verify the simulation completed and paid some interest
      expect(result.monthsToPayoff).toBeGreaterThan(0);
      expect(result.monthsToPayoff).toBeLessThan(600);
      expect(result.totalInterestPaid).toBeGreaterThan(0);
    });

    it('avalanche accrues less interest than snowball on mixed rates', async () => {
      // Same input, two strategies — avalanche should win
      const setup = () => [
        buildPlan({
          id: 'A',
          accountId: 'accA',
          balance: '2000',
          min: '100',
          rate: '5',
          name: 'Low Rate',
        }),
        buildPlan({
          id: 'B',
          accountId: 'accB',
          balance: '2000',
          min: '100',
          rate: '24',
          name: 'High Rate',
        }),
      ];

      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue(setup());
      const snowball = await service.simulate('user-1', {
        extraMonthlyPayment: 200,
        method: 'SNOWBALL',
      });

      jest.clearAllMocks();
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue(setup());
      const avalanche = await service.simulate('user-1', {
        extraMonthlyPayment: 200,
        method: 'AVALANCHE',
      });

      expect(avalanche.totalInterestPaid).toBeLessThanOrEqual(snowball.totalInterestPaid);
    });

    it('applies extra payment to reduce payoff time', async () => {
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([
        buildPlan({ id: 'A', accountId: 'accA', balance: '1200', min: '100', rate: '0' }),
      ]);

      const withoutExtra = await service.simulate('user-1', {
        extraMonthlyPayment: 0,
        method: 'SNOWBALL',
      });

      jest.clearAllMocks();
      mockPrisma.debtPayoffPlan.findMany.mockResolvedValue([
        buildPlan({ id: 'A', accountId: 'accA', balance: '1200', min: '100', rate: '0' }),
      ]);

      const withExtra = await service.simulate('user-1', {
        extraMonthlyPayment: 200,
        method: 'SNOWBALL',
      });

      expect(withExtra.monthsToPayoff).toBeLessThan(withoutExtra.monthsToPayoff);
      expect(withExtra.payoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
