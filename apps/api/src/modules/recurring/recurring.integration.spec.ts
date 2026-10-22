import { Test, TestingModule } from '@nestjs/testing';
import { RecurringService } from './recurring.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Recurring Generator (Integration)', () => {
  let service: RecurringService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let accountId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [RecurringService, PrismaService],
    }).compile();

    service = module.get<RecurringService>(RecurringService);
    prisma = module.get<PrismaService>(PrismaService);

    // Create test user and account
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `rec-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Rec Test',
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
        currentBalance: 10000,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should generate a transaction and update the rule, and be idempotent', async () => {
    // 1. Create a rule due yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const rule = await prisma.recurringRule.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        containerId,
        accountId,
        type: 'EXPENSE',
        amount: 500,
        currency: 'KES',
        description: 'Test Bill',
        frequency: 'MONTHLY',
        interval: 1,
        startDate: yesterday,
        nextOccurrence: yesterday,
        status: 'ACTIVE',
      },
    });

    // 2. Run the generator
    const result = await service.generateDueTransactions();

    // 3. Verify the transaction was created
    expect(result.processed).toBe(1);

    const transaction = await prisma.transaction.findFirst({ where: { recurringRuleId: rule.id } });
    expect(transaction).not.toBeNull();

    // 4. Verify the account balance updated (10000 - 500)
    const account = await prisma.account.findUnique({ where: { id: accountId } });
    expect(Number(account?.currentBalance)).toBe(9500);

    // 5. Verify the rule advanced to next month
    const updatedRule = await prisma.recurringRule.findUnique({ where: { id: rule.id } });
    expect(updatedRule?.nextOccurrence.getTime()).toBeGreaterThan(yesterday.getTime());

    // 6. IDEMPOTENCY: Run the generator again immediately.
    // It should process 0 rules because the next occurrence is now in the future.
    const secondResult = await service.generateDueTransactions();
    expect(secondResult.processed).toBe(0);

    // Verify only one transaction exists
    const transactionCount = await prisma.transaction.count({
      where: { recurringRuleId: rule.id },
    });
    expect(transactionCount).toBe(1);
  });
});
