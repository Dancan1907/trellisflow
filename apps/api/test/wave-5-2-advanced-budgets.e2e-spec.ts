import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { InsightsService } from '../src/modules/insights/insights.service';

describe('Wave 5.2 - Advanced Budgets (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let insightsService: InsightsService;
  let authToken: string;
  let userId: string;
  const testEmail = `wave5-2-budgets-${Date.now()}@trellisflow.test`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    insightsService = app.get<InsightsService>(InsightsService);
    await app.init();

    // 1. Create user
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: testEmail, password: 'Password123!', name: 'Budget Tester' });
    authToken = signupRes.body.accessToken;

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    userId = user!.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('Golden Path: Rollover, Alerts, Business Budgets, and Unbudgeted Spending', async () => {
    // --- Setup: Container and Categories ---
    const container = await prisma.container.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'PERSONAL',
        name: 'Personal',
        currency: 'KES',
      },
    });

    const budgetedCategory = await prisma.category.create({
      data: { id: crypto.randomUUID(), userId, name: 'Groceries', type: 'EXPENSE' },
    });

    const unbudgetedCategory = await prisma.category.create({
      data: { id: crypto.randomUUID(), userId, name: 'Entertainment', type: 'EXPENSE' },
    });

    // --- 1. Create Budget with Rollover ---
    const budgetRes = await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        containerId: container.id,
        categoryId: budgetedCategory.id,
        amount: 10000,
        currency: 'KES',
        period: 'MONTHLY',
        method: 'TARGET',
        rollover: true,
      })
      .expect(201);

    const budgetId = budgetRes.body.id;

    // --- 2. Setup Rollover Math ---
    // Create a transaction for LAST month (4000 spent)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        containerId: container.id,
        accountId: crypto.randomUUID(), // Fake account
        type: 'EXPENSE',
        amount: 4000,
        currency: 'KES',
        date: lastMonth,
        description: 'Last month groceries',
        categoryId: budgetedCategory.id,
        source: 'MANUAL',
        status: 'POSTED',
      },
    });

    // Create a transaction for THIS month (13000 spent)
    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        containerId: container.id,
        accountId: crypto.randomUUID(),
        type: 'EXPENSE',
        amount: 13000,
        currency: 'KES',
        date: new Date(),
        description: 'This month groceries',
        categoryId: budgetedCategory.id,
        source: 'MANUAL',
        status: 'POSTED',
      },
    });

    // --- 3. Verify Rollover Math & Alerts ---
    const budgetCheck = await request(app.getHttpServer())
      .get(`/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Expected rollover: 10000 (base) - 4000 (prev spent) = 6000
    // Effective amount: 10000 + 6000 = 16000
    // Spent: 13000
    expect(budgetCheck.body.rolloverBalance).toBe(6000);
    expect(budgetCheck.body.amount).toBe(16000);
    expect(budgetCheck.body.spent).toBe(13000);
    // Percentage: 13000 / 16000 = 81.25% (Triggers Near Limit alert)

    // Manually trigger insights generation (normally done by a cron job)
    await insightsService.generateForUser(userId);

    const insights = await prisma.insight.findMany({
      where: { userId, type: 'BUDGET_NEAR_LIMIT', relatedEntityId: budgetId },
    });
    expect(insights.length).toBe(1);
    expect(insights[0].message).toContain('81%');

    // --- 4. Business Budgets ---
    const business = await prisma.container.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        type: 'INTERNAL_BUSINESS',
        name: 'My Shop',
        currency: 'KES',
      },
    });

    await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        containerId: business.id,
        categoryId: budgetedCategory.id,
        amount: 5000,
        currency: 'KES',
        period: 'MONTHLY',
        method: 'ENVELOPE', // Test Envelope method
      })
      .expect(201);

    // --- 5. Unbudgeted Spending Report ---
    // Create a 500 KES expense in the 'Entertainment' category (which has no budget)
    await prisma.transaction.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        containerId: container.id,
        accountId: crypto.randomUUID(),
        type: 'EXPENSE',
        amount: 500,
        currency: 'KES',
        date: new Date(),
        description: 'Movie night',
        categoryId: unbudgetedCategory.id,
        source: 'MANUAL',
        status: 'POSTED',
      },
    });

    const unbudgetedRes = await request(app.getHttpServer())
      .get('/budgets/unbudgeted')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(unbudgetedRes.body).toHaveLength(1);
    expect(unbudgetedRes.body[0].categoryName).toBe('Entertainment');
    expect(unbudgetedRes.body[0].total).toBe(500);
  });
});
