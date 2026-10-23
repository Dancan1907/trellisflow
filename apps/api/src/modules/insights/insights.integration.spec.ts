import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';

describe('Insights (Integration)', () => {
  let service: InsightsService;
  let prisma: PrismaService;
  let testUserId: string;
  let containerId: string;
  let categoryId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [InsightsService, PrismaService],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
    prisma = module.get<PrismaService>(PrismaService);

    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `insight-int-${Date.now()}@trellisflow.com`,
        passwordHash: 'x',
        name: 'Insight Test',
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

  it('should create a real insight when a real budget is overspent', async () => {
    // 1. Create a budget of 1000
    await prisma.budget.create({
      data: {
        id: randomUUID(),
        userId: testUserId,
        containerId,
        categoryId,
        amount: 1000,
        currency: 'KES',
        period: 'MONTHLY',
        status: 'ACTIVE',
      },
    });

    // 2. Create an expense of 1500 (overspent)
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
        amount: 1500,
        currency: 'KES',
        date: new Date(),
        description: 'Groceries',
        categoryId,
        source: 'MANUAL',
        status: 'POSTED',
      },
    });

    // 3. Run the generator
    const result = await service.generateForUser(testUserId);
    expect(result.created).toBe(1);

    // 4. Verify the insight is in the database
    const insights = await prisma.insight.findMany({ where: { userId: testUserId } });
    expect(insights.length).toBe(1);
    expect(insights[0].type).toBe('BUDGET_OVERSPENT');
  });
});
