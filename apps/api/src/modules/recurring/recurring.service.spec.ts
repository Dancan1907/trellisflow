import { Test, TestingModule } from '@nestjs/testing';
import { RecurringService } from './recurring.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  account: { findFirst: jest.fn() },
  $transaction: jest.fn(),
  recurringRule: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

describe('RecurringService (Unit)', () => {
  let service: RecurringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurringService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<RecurringService>(RecurringService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateNextOccurrence', () => {
    it('should advance DAILY by interval', () => {
      const current = new Date('2026-10-20');
      const next = service.calculateNextOccurrence(current, 'DAILY', 2);
      expect(next.toISOString().split('T')[0]).toBe('2026-10-22');
    });

    it('should advance WEEKLY by interval', () => {
      const current = new Date('2026-10-20');
      const next = service.calculateNextOccurrence(current, 'WEEKLY', 1);
      expect(next.toISOString().split('T')[0]).toBe('2026-10-27');
    });

    it('should advance MONTHLY by interval', () => {
      const current = new Date('2026-10-20');
      const next = service.calculateNextOccurrence(current, 'MONTHLY', 1);
      expect(next.toISOString().split('T')[0]).toBe('2026-11-20');
    });

    it('should preserve a day-31 monthly anchor across February', () => {
      const january = new Date('2026-01-31T00:00:00.000Z');
      const february = service.calculateNextOccurrence(january, 'MONTHLY', 1, 31);
      const march = service.calculateNextOccurrence(february, 'MONTHLY', 1, 31);

      // February clamps to its final day, then the original 31st anchor resumes.
      expect(february.toISOString().slice(0, 10)).toBe('2026-02-28');
      expect(march.toISOString().slice(0, 10)).toBe('2026-03-31');
    });

    it('should preserve month-end anchors for quarterly schedules', () => {
      const january = new Date('2026-01-31T00:00:00.000Z');
      const april = service.calculateNextOccurrence(january, 'QUARTERLY', 1, 31);
      const july = service.calculateNextOccurrence(april, 'QUARTERLY', 1, 31);

      expect(april.toISOString().slice(0, 10)).toBe('2026-04-30');
      expect(july.toISOString().slice(0, 10)).toBe('2026-07-31');
    });

    it('should handle leap year end-of-month (Jan 31 -> Feb 29)', () => {
      const current = new Date('2028-01-31'); // 2028 is a leap year
      const next = service.calculateNextOccurrence(current, 'MONTHLY', 1);
      expect(next.toISOString().split('T')[0]).toBe('2028-02-29');
    });

    it('should advance YEARLY by interval', () => {
      const current = new Date('2026-10-20');
      const next = service.calculateNextOccurrence(current, 'YEARLY', 1);
      expect(next.toISOString().split('T')[0]).toBe('2027-10-20');
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          type: 'EXPENSE',
          amount: 100,
          accountId: 'fake',
          description: 'Test',
          frequency: 'MONTHLY',
          startDate: '2026-10-20',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });


  describe('generateDueTransactions', () => {
    it('generates both sides of a recurring transfer and updates both balances atomically', async () => {
      const source = {
        id: 'account-source',
        userId: 'user-1',
        containerId: 'container-1',
        currency: 'KES',
      };
      const destination = {
        id: 'account-destination',
        userId: 'user-1',
        containerId: 'container-1',
        currency: 'KES',
        status: 'ACTIVE',
      };
      const rule = {
        id: 'rule-1',
        userId: 'user-1',
        containerId: 'container-1',
        accountId: source.id,
        transferToAccountId: destination.id,
        type: 'TRANSFER',
        amount: 250,
        currency: 'KES',
        description: 'Monthly savings',
        frequency: 'MONTHLY',
        interval: 1,
        dayOfMonth: new Date().getUTCDate(),
        dayOfWeek: null,
        startDate: new Date(),
        nextOccurrence: new Date(Date.now() - 60_000),
        endDate: null,
        status: 'ACTIVE',
      };
      const tx = {
        account: { findFirst: jest.fn().mockResolvedValue(destination), update: jest.fn().mockResolvedValue({}) },
        transaction: { create: jest.fn().mockResolvedValue({}) },
        recurringRule: { update: jest.fn().mockResolvedValue({}) },
      };
      mockPrisma.recurringRule.findMany.mockResolvedValue([rule]);
      mockPrisma.$transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));

      const result = await service.generateDueTransactions();

      expect(result).toEqual({ processed: 1, failed: 0, total: 1 });
      expect(tx.transaction.create).toHaveBeenCalledTimes(2);
      const [outgoing, incoming] = tx.transaction.create.mock.calls.map((call) => call[0].data);
      expect(outgoing).toEqual(expect.objectContaining({
        accountId: source.id,
        type: 'TRANSFER',
        amount: -250,
        source: 'RECURRING',
        recurringRuleId: rule.id,
      }));
      expect(incoming).toEqual(expect.objectContaining({
        accountId: destination.id,
        type: 'TRANSFER',
        amount: 250,
        source: 'RECURRING',
        recurringRuleId: rule.id,
      }));
      expect(outgoing.transferPairId).toBe(incoming.transferPairId);
      expect(tx.account.update).toHaveBeenNthCalledWith(1, {
        where: { id: source.id },
        data: { currentBalance: { decrement: 250 } },
      });
      expect(tx.account.update).toHaveBeenNthCalledWith(2, {
        where: { id: destination.id },
        data: { currentBalance: { increment: 250 } },
      });
      expect(tx.recurringRule.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: rule.id },
        data: expect.objectContaining({ lastGeneratedAt: rule.nextOccurrence }),
      }));
    });
  });

  describe('getUpcoming', () => {
    it('should query rules within the default 30 days', async () => {
      mockPrisma.recurringRule.findMany.mockResolvedValue([]);

      await service.getUpcoming('user-1', {});

      expect(mockPrisma.recurringRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });
});
