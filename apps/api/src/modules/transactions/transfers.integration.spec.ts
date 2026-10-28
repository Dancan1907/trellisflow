import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { BalanceService } from './balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClsModule } from 'nestjs-cls';

describe('Transfers (Integration)', () => {
  let service: TransactionsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountAId: string;
  let accountBId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [
        TransactionsService,
        BalanceService,
        PrismaService,
        AuditLogService,
        { provide: SnapshotsService, useValue: { computeAndSaveForUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Create a dummy user
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `transfer-test-${Date.now()}@trellisflow.com`,
        passwordHash: 'dummy',
        name: 'Transfer Test',
      },
    });

    // Create a container
    containerId = randomUUID();
    await prisma.container.create({
      data: {
        id: containerId,
        userId: testUserId,
        type: 'PERSONAL',
        name: 'Personal',
        currency: 'KES',
        status: 'ACTIVE',
      },
    });

    // Create two accounts with balance 1000 each
    accountAId = randomUUID();
    accountBId = randomUUID();
    await prisma.account.createMany({
      data: [
        {
          id: accountAId,
          userId: testUserId,
          containerId,
          name: 'Account A',
          category: 'ASSET',
          accountType: 'CHECKING',
          currency: 'KES',
          currentBalance: 1000,
        },
        {
          id: accountBId,
          userId: testUserId,
          containerId,
          name: 'Account B',
          category: 'ASSET',
          accountType: 'SAVINGS',
          currency: 'KES',
          currentBalance: 1000,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should transfer money atomically and update both balances', async () => {
    await service.transfer(testUserId, {
      fromAccountId: accountAId,
      toAccountId: accountBId,
      amount: 300,
      date: '2026-10-20',
      description: 'Test transfer',
    });

    const accA = await prisma.account.findUnique({ where: { id: accountAId } });
    const accB = await prisma.account.findUnique({ where: { id: accountBId } });

    expect(Number(accA?.currentBalance)).toBe(700); // 1000 - 300
    expect(Number(accB?.currentBalance)).toBe(1300); // 1000 + 300

    // Verify two linked transactions exist
    const transactions = await prisma.transaction.findMany({
      where: { accountId: { in: [accountAId, accountBId] }, type: 'TRANSFER' },
    });
    expect(transactions.length).toBe(2);
    expect(transactions[0]!.transferPairId).toBe(transactions[1]!.transferPairId);
  });

  it('should reject transfers between different containers', async () => {
    // Create a second container
    const otherContainerId = randomUUID();
    await prisma.container.create({
      data: {
        id: otherContainerId,
        userId: testUserId,
        type: 'INTERNAL_BUSINESS',
        name: 'Business',
        currency: 'KES',
      },
    });

    // Create an account in the other container
    const otherAccountId = randomUUID();
    await prisma.account.create({
      data: {
        id: otherAccountId,
        userId: testUserId,
        containerId: otherContainerId,
        name: 'Business Account',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 500,
      },
    });

    await expect(
      service.transfer(testUserId, {
        fromAccountId: accountAId,
        toAccountId: otherAccountId,
        amount: 100,
        date: '2026-10-20',
        description: 'Illegal transfer',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
