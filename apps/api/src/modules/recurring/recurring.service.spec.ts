import { Test, TestingModule } from '@nestjs/testing';
import { RecurringService } from './recurring.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockPrisma = {
  account: { findFirst: jest.fn() },
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

    it('should handle end-of-month gracefully (Jan 31 -> Feb 28)', () => {
      const current = new Date('2026-01-31');
      const next = service.calculateNextOccurrence(current, 'MONTHLY', 1);
      // 2026 is not a leap year, so Feb has 28 days
      expect(next.toISOString().split('T')[0]).toBe('2026-02-28');
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
