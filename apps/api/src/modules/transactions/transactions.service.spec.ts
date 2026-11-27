import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { BalanceService } from './balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

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

  describe('idempotent writes', () => {
    const key = '00000000-0000-4000-8000-000000000123';

    it('returns the original transaction for a matching retry without applying its balance twice', async () => {
      const existing = {
        id: 'tx-existing', type: 'EXPENSE', accountId: 'acc-1', amount: '100',
        date: new Date('2026-10-20T00:00:00.000Z'), description: 'Test',
        categoryId: null, notes: null,
      };
      mockPrisma.transaction.findFirst.mockResolvedValue(existing);

      const result = await service.create('user-1', {
        type: 'EXPENSE', amount: 100, date: '2026-10-20', description: 'Test',
        accountId: 'acc-1', idempotencyKey: key,
      });

      expect(result).toBe(existing);
      expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockBalanceService.applyTransactionEffect).not.toHaveBeenCalled();
    });

    it('recovers a concurrent create race by returning the committed transaction', async () => {
      const existing = {
        id: 'tx-winner', type: 'EXPENSE', accountId: 'acc-1', amount: '100',
        date: new Date('2026-10-20T00:00:00.000Z'), description: 'Test',
        categoryId: null, notes: null,
      };
      mockPrisma.transaction.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acc-1', containerId: 'cont-1', currency: 'KES',
      });
      mockPrisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });

      const result = await service.create('user-1', {
        type: 'EXPENSE', amount: 100, date: '2026-10-20', description: 'Test',
        accountId: 'acc-1', idempotencyKey: key,
      });

      expect(result).toBe(existing);
      expect(mockBalanceService.applyTransactionEffect).not.toHaveBeenCalled();
    });

    it('rejects reuse of a transaction key with a different payload', async () => {
      mockPrisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-existing', type: 'EXPENSE', accountId: 'acc-1', amount: '100',
        date: new Date('2026-10-20T00:00:00.000Z'), description: 'Test',
        categoryId: null, notes: null,
      });

      await expect(service.create('user-1', {
        type: 'EXPENSE', amount: 200, date: '2026-10-20', description: 'Test',
        accountId: 'acc-1', idempotencyKey: key,
      })).rejects.toBeInstanceOf(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns both existing transfer rows for a matching retry', async () => {
      const date = new Date('2026-10-20T00:00:00.000Z');
      const outTx = {
        id: 'transfer-out', type: 'TRANSFER', accountId: 'from-1', amount: '-50',
        date, description: 'Savings', notes: null, transferPairId: 'pair-1',
      };
      const inTx = {
        id: 'transfer-in', type: 'TRANSFER', accountId: 'to-1', amount: '50',
        date, description: 'Savings', notes: null, transferPairId: 'pair-1',
      };
      mockPrisma.transaction.findFirst.mockResolvedValue(outTx);
      mockPrisma.transaction.findMany.mockResolvedValue([outTx, inTx]);

      const result = await service.transfer('user-1', {
        fromAccountId: 'from-1', toAccountId: 'to-1', amount: 50,
        date: '2026-10-20', description: 'Savings', idempotencyKey: key,
      });

      expect(result).toEqual({ outTx, inTx });
      expect(mockPrisma.account.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockBalanceService.applyTransactionEffect).not.toHaveBeenCalled();
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
