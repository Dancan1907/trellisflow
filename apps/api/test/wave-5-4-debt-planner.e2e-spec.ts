import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('Wave 5.4 - Debt Payoff Planner (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let containerId: string;
  const testEmail = `wave5-4-debts-${Date.now()}@trellisflow.test`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 1. Create user via signup
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: testEmail, password: 'Password123!', name: 'Debt E2E Tester' });
    authToken = signupRes.body.accessToken;

    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    userId = user!.id;

    // 2. Get the auto-created personal container
    const container = await prisma.container.findFirst({
      where: { userId, type: 'PERSONAL' },
    });
    containerId = container!.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  async function createLiabilityAccount(name: string, balance: number): Promise<string> {
    const accountId = randomUUID();
    await prisma.account.create({
      data: {
        id: accountId,
        userId,
        containerId,
        name,
        category: 'LIABILITY',
        accountType: 'CREDIT_CARD',
        currency: 'KES',
        currentBalance: balance,
      },
    });
    return accountId;
  }

  it('Snowball Golden Path: 0% APR rolls freed minimums forward (7 months)', async () => {
    // --- Setup: Two 0% APR debts ---
    // Debt A: 300 balance, 100 min
    // Debt B: 1000 balance, 100 min
    const accA = await createLiabilityAccount('E2E Debt A', 300);
    const accB = await createLiabilityAccount('E2E Debt B', 1000);

    // --- Create debt plans via HTTP ---
    const planARes = await request(app.getHttpServer())
      .post('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ accountId: accA, minimumPayment: 100, interestRate: 0 })
      .expect(201);

    expect(planARes.body.accountId).toBe(accA);
    expect(planARes.body.method).toBe('SNOWBALL');

    await request(app.getHttpServer())
      .post('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ accountId: accB, minimumPayment: 100, interestRate: 0 })
      .expect(201);

    // --- Run Simulation ---
    const simRes = await request(app.getHttpServer())
      .post('/debts/simulate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ extraMonthlyPayment: 0, method: 'SNOWBALL' })
      .expect(201);

    expect(simRes.body.monthsToPayoff).toBe(7);
    expect(simRes.body.totalInterestPaid).toBe(0);
    expect(simRes.body.history).toHaveLength(7);
    expect(simRes.body.history[0].totalBalance).toBe(1100); // M1
    expect(simRes.body.history[6].totalBalance).toBe(0); // M7
    expect(simRes.body.payoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // --- Verify list endpoint ---
    const listRes = await request(app.getHttpServer())
      .get('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(listRes.body).toHaveLength(2);
    expect(listRes.body.find((p: any) => p.accountId === accA)).toBeDefined();

    // --- Verify delete/archive ---
    await request(app.getHttpServer())
      .delete(`/debts/${planARes.body.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(afterDelete.body).toHaveLength(1);
    expect(afterDelete.body[0].accountId).toBe(accB);

    // Cleanup for next test
    await prisma.account.deleteMany({ where: { id: { in: [accA, accB] } } });
  });

  it('Avalanche Strategy: prioritizes highest interest debt and accrues less total interest', async () => {
    // Debt C: 1000 balance, 100 min, 5% APR
    // Debt D: 500 balance, 100 min, 24% APR
    const accC = await createLiabilityAccount('E2E Low Rate', 1000);
    const accD = await createLiabilityAccount('E2E High Rate', 500);

    await request(app.getHttpServer())
      .post('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ accountId: accC, minimumPayment: 100, interestRate: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ accountId: accD, minimumPayment: 100, interestRate: 24 })
      .expect(201);

    // --- Run Avalanche simulation ---
    const avalancheRes = await request(app.getHttpServer())
      .post('/debts/simulate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ extraMonthlyPayment: 0, method: 'AVALANCHE' })
      .expect(201);

    expect(avalancheRes.body.monthsToPayoff).toBeGreaterThan(0);
    expect(avalancheRes.body.monthsToPayoff).toBeLessThan(600);
    expect(avalancheRes.body.totalInterestPaid).toBeGreaterThan(0);
    expect(avalancheRes.body.history[avalancheRes.body.history.length - 1].totalBalance).toBe(0);

    // --- Run Snowball simulation for comparison ---
    const snowballRes = await request(app.getHttpServer())
      .post('/debts/simulate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ extraMonthlyPayment: 0, method: 'SNOWBALL' })
      .expect(201);

    // Avalanche should pay LESS total interest than snowball on mixed rates
    expect(avalancheRes.body.totalInterestPaid).toBeLessThanOrEqual(
      snowballRes.body.totalInterestPaid,
    );

    await prisma.account.deleteMany({ where: { id: { in: [accC, accD] } } });
  });

  it('Rejects debt plan creation for non-liability accounts', async () => {
    // Create an ASSET account
    const assetAccId = randomUUID();
    await prisma.account.create({
      data: {
        id: assetAccId,
        userId,
        containerId,
        name: 'E2E Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        currentBalance: 5000,
      },
    });

    await request(app.getHttpServer())
      .post('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ accountId: assetAccId, minimumPayment: 100, interestRate: 5 })
      .expect(404);

    await prisma.account.deleteMany({ where: { id: assetAccId } });
  });

  it('Rejects simulation when no active debts exist', async () => {
    // Make sure all accounts are cleaned up first
    const existing = await request(app.getHttpServer())
      .get('/debts')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    if (existing.body.length > 0) {
      for (const plan of existing.body) {
        await request(app.getHttpServer())
          .delete(`/debts/${plan.id}`)
          .set('Authorization', `Bearer ${authToken}`);
      }
    }

    await request(app.getHttpServer())
      .post('/debts/simulate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ extraMonthlyPayment: 100, method: 'SNOWBALL' })
      .expect(400);
  });
});
