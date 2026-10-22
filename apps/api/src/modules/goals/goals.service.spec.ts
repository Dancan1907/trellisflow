import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  savingsGoal: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  account: { findUnique: jest.fn(), findFirst: jest.fn() },
  container: { findFirst: jest.fn() },
};

describe('GoalsService (Unit)', () => {
  let service: GoalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoalsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<GoalsService>(GoalsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('calculateProgress (via findOne)', () => {
    it('should calculate progress from a linked account balance', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue({
        id: 'g1',
        targetAmount: 10000,
        linkedAccountId: 'acc1',
        manualSavedAmount: null,
      });
      // Mock the linked account having 4,000
      mockPrisma.account.findUnique.mockResolvedValue({ currentBalance: 4000 });

      const result = await service.findOne('u1', 'g1');

      expect(result.currentAmount).toBe(4000);
      expect(result.remaining).toBe(6000);
      expect(result.percentage).toBe(40);
    });

    it('should fallback to manual amount if not linked to an account', async () => {
      mockPrisma.savingsGoal.findFirst.mockResolvedValue({
        id: 'g1',
        targetAmount: 10000,
        linkedAccountId: null,
        manualSavedAmount: 2000,
      });

      const result = await service.findOne('u1', 'g1');

      expect(result.currentAmount).toBe(2000);
      expect(result.percentage).toBe(20);
    });
  });
});
