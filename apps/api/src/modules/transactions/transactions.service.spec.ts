import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { BalanceService } from './balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { NotFoundException } from '@nestjs/common';

// Create the mock transaction client first
const mockTx = {
  transaction: {
    create: jest.fn(),
    update: jest.fn(),
  },
  account: {
    update: jest.fn(),
  },
};

const mockPrisma = {
  account: { findFirst: jest.fn() },
  category: { findFirst: jest.fn() },
  transaction: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  // Now we can safely reference mockTx
  $transaction: jest.fn((cb) => cb(mockTx)),
};

const mockBalanceService = {
  applyTransactionEffect: jest.fn(),
};

const mockAuditLog = {
  log: jest.fn(),
};

const mockSnapshotsService = {
  computeAndSaveForUser: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BalanceService, useValue: mockBalanceService },
        { provide: AuditLogService, useValue: mockAuditLog },
        { provide: SnapshotsService, useValue: mockSnapshotsService },
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
      mockTx.transaction.create.mockResolvedValue({ id: 'tx-1' });

      const result = await service.create('user-1', {
        type: 'EXPENSE',
        amount: 100,
        date: '2026-10-20',
        description: 'Test',
        accountId: 'acc-1',
      });

      // Verify transaction was created
      expect(mockTx.transaction.create).toHaveBeenCalled();

      // Verify BalanceService was called with the right math
      expect(mockBalanceService.applyTransactionEffect).toHaveBeenCalledWith(
        mockTx,
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

      mockTx.transaction.update.mockResolvedValue({ id: 'tx-1', deletedAt: new Date() });

      await service.remove('user-1', 'tx-1');

      // Verify BalanceService was called to reverse the effect (-1)
      expect(mockBalanceService.applyTransactionEffect).toHaveBeenCalledWith(
        mockTx,
        'acc-1',
        'EXPENSE',
        100,
        -1, // direction: reverse
      );

      // Verify soft delete
      expect(mockTx.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tx-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });
});
