import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { BalanceService } from './balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  account: { findFirst: jest.fn() },
  category: { findFirst: jest.fn() },
  transaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)), // Execute the callback immediately with the mock
};

const mockBalanceService = {
  applyTransactionEffect: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BalanceService, useValue: mockBalanceService },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException if account does not exist', async () => {
      mockPrisma.account.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', {
          type: 'EXPENSE',
          amount: 100,
          date: '2026-10-20',
          description: 'Test',
          accountId: 'fake-account',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a transaction and call BalanceService', async () => {
      // Mock account exists
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acc-1',
        containerId: 'cont-1',
        currency: 'KES',
      });

      // Mock transaction creation
      mockPrisma.transaction.create.mockResolvedValue({ id: 'tx-1' });

      const result = await service.create('user-1', {
        type: 'EXPENSE',
        amount: 100,
        date: '2026-10-20',
        description: 'Test',
        accountId: 'acc-1',
      });

      // Verify transaction was created
      expect(mockPrisma.transaction.create).toHaveBeenCalled();

      // Verify BalanceService was called with the right math
      expect(mockBalanceService.applyTransactionEffect).toHaveBeenCalledWith(
        expect.anything(),
        'acc-1',
        'EXPENSE',
        100,
        1, // direction: apply
      );

      expect(result).toEqual({ id: 'tx-1' });
    });
  });

  describe('remove', () => {
    it('should soft delete transaction and reverse balance', async () => {
      // Mock existing transaction
      mockPrisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        accountId: 'acc-1',
        type: 'EXPENSE',
        amount: '100',
      });

      mockPrisma.transaction.update.mockResolvedValue({ id: 'tx-1', deletedAt: new Date() });

      await service.remove('user-1', 'tx-1');

      // Verify BalanceService was called to reverse the effect (-1)
      expect(mockBalanceService.applyTransactionEffect).toHaveBeenCalledWith(
        expect.anything(),
        'acc-1',
        'EXPENSE',
        100,
        -1, // direction: reverse
      );

      // Verify soft delete
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tx-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });
});
