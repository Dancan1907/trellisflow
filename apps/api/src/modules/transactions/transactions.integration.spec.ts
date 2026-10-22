import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { BalanceService } from './balance.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit.service';
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
      providers: [TransactionsService, BalanceService, PrismaService, AuditLogService],
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

  it('should create a transaction and atomically update the account balance', async () => {
    await service.create(testUserId, {
      type: 'EXPENSE',
      amount: 250,
      date: '2026-10-20',
      description: 'Groceries',
      accountId,
    });

    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(acc?.currentBalance)).toBe(750); // 1000 - 250

    // Verify the DB actually has the transaction
    const tx = await prisma.transaction.findFirst({ where: { accountId } });
    expect(tx).not.toBeNull();
  });
});
