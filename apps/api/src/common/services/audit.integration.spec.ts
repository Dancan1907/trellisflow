import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../../modules/transactions/transactions.service';
import { BalanceService } from '../../modules/transactions/balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from './audit.service';
import { SnapshotsService } from '../../modules/snapshots/snapshots.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('AuditLog (Integration)', () => {
  let txService: TransactionsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountId: string;

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

    txService = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `audit-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Audit Test',
      },
    });

    containerId = randomUUID();
    await prisma.container.create({
      data: {
        id: containerId,
        userId: testUserId,
        type: 'PERSONAL',
        name: 'Personal',
        currency: 'KES',
      },
    });

    accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId: testUserId,
        containerId,
        name: 'Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 1000,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should write an audit log when a transaction is created', async () => {
    // 1. Create a transaction (this should also create an audit log)
    await txService.create(testUserId, {
      type: 'EXPENSE',
      amount: 100,
      date: '2026-10-20',
      description: 'Audit test purchase',
      accountId,
    });

    // 2. Verify the audit log exists in the DB
    const logs = await prisma.auditLog.findMany({
      where: { userId: testUserId },
    });

    expect(logs.length).toBe(1);
    expect(logs[0]!.action).toBe('CREATE');
    expect(logs[0]!.entityType).toBe('Transaction');
    expect(logs[0]!.after).toBeDefined();

    // Verify the 'after' state holds the description
    const afterState = logs[0]!.after as any;
    expect(afterState.description).toBe('Audit test purchase');
  });
});
