import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Budgets (Integration)', () => {
  let service: BudgetsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let categoryId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [BudgetsService, PrismaService],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `budget-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Budget Test',
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

    categoryId = randomUUID();
    await prisma.category.create({
      data: { id: categoryId, userId: testUserId, name: 'Groceries', type: 'EXPENSE' },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('should track spending against a budget from real database transactions', async () => {
    // 1. Create a budget for 10,000
    const budget = await service.create(testUserId, {
      containerId,
      categoryId,
      amount: 10000,
      currency: 'KES',
      period: 'MONTHLY',
    });

    expect(budget.amount).toBe('10000');

    // 2. Add a real transaction of 3,000
    const accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId: testUserId,
        containerId,
        name: 'Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 5000,
      },
    });

    await prisma.transaction.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        containerId,
        accountId,
        type: 'EXPENSE',
        amount: 3000,
        currency: 'KES',
        date: new Date(),
        description: 'Groceries',
        categoryId,
        source: 'MANUAL',
        status: 'POSTED',
      },
    });

    // 3. Fetch the budget and check the math
    const result = await service.findOne(testUserId, budget.id);

    expect(result.spent).toBe(3000);
    expect(result.remaining).toBe(7000);
    expect(result.percentage).toBe(30);
  });
});
