import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { BalanceService } from './balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Transactions (Integration)', () => {
  let service: TransactionsService;
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

    service = module.get<TransactionsService>(TransactionsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `tx-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Tx Test',
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

  it('allows only one write when duplicate M-Pesa confirmations race', async () => {
    const reference = `R-${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const before = Number((await prisma.account.findUnique({ where: { id: accountId } }))?.currentBalance);

    const results = await Promise.allSettled([
      service.create(testUserId, {
        type: 'INCOME',
        amount: 100,
        date: '2026-11-20',
        description: 'Concurrent M-Pesa confirmation',
        accountId,
        mpesaReference: reference,
      }),
      service.create(testUserId, {
        type: 'INCOME',
        amount: 100,
        date: '2026-11-20',
        description: 'Concurrent M-Pesa confirmation',
        accountId,
        mpesaReference: reference,
      }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason.getStatus()).toBe(409);

    const matching = await prisma.transaction.findMany({
      where: { userId: testUserId, mpesaReference: reference.toUpperCase() },
    });
    expect(matching).toHaveLength(1);
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(account?.currentBalance)).toBe(before + 100);
  });

  it('returns one transaction for concurrent retries with the same idempotency key', async () => {
    const idempotencyKey = randomUUID();
    const before = Number((await prisma.account.findUnique({ where: { id: accountId } }))?.currentBalance);
    const input = {
      type: 'EXPENSE' as const,
      amount: 75,
      date: '2026-11-21',
      description: 'Idempotent retry',
      accountId,
      idempotencyKey,
    };

    const results = await Promise.all([
      service.create(testUserId, input),
      service.create(testUserId, input),
    ]);

    expect(results[0].id).toBe(results[1].id);
    const matching = await prisma.transaction.findMany({
      where: { userId: testUserId, idempotencyKey },
    });
    expect(matching).toHaveLength(1);
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(account?.currentBalance)).toBe(before - 75);
  });

  it('should create a transaction and atomically update the account balance', async () => {
    const before = Number((await prisma.account.findUnique({ where: { id: accountId } }))?.currentBalance);
    await service.create(testUserId, {
      type: 'EXPENSE',
      amount: 250,
      date: '2026-10-20',
      description: 'Groceries',
      accountId,
    });

    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(acc?.currentBalance)).toBe(before - 250);

    // Verify the DB actually has the transaction
    const tx = await prisma.transaction.findFirst({ where: { accountId } });
    expect(tx).not.toBeNull();
  });
});
