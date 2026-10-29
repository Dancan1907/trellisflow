import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wave 1 — Golden Path (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let accountId: string;
  let containerId: string;
  let categoryIncomeId: string;
  let categoryExpenseId: string;
  let budgetId: string;
  let goalId: string;

  const testEmail = `wave1-e2e-${Date.now()}@trellisflow.com`;
  const testPassword = 'password123';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: 0 }],
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'wave1-e2e-' } },
    });
    await app.close();
  });

  // 1-12: unchanged — keep them as-is
  it('1. signs up a new user and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: testPassword, name: 'Wave 1 User' })
      .expect(201);

    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    accessToken = res.body.accessToken;
  });

  it('2. auto-creates a Personal container and default categories', async () => {
    const catRes = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(catRes.body)).toBe(true);
    expect(catRes.body.length).toBeGreaterThan(0);

    const income = catRes.body.find((c: any) => c.type === 'INCOME');
    const expense = catRes.body.find((c: any) => c.type === 'EXPENSE');
    expect(income).toBeDefined();
    expect(expense).toBeDefined();
    categoryIncomeId = income.id;
    categoryExpenseId = expense.id;

    const contRes = await request(app.getHttpServer())
      .get('/api/containers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(contRes.body.length).toBeGreaterThanOrEqual(1);
    const personal = contRes.body.find((c: any) => c.type === 'PERSONAL');
    expect(personal).toBeDefined();
    expect(personal.name).toBe('Personal');

    containerId = personal.id;
  });

  it('3. creates a checking account with opening balance', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        name: 'Main Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        initialBalance: 1000,
      })
      .expect(201);

    expect(res.body.name).toBe('Main Checking');
    expect(Number(res.body.currentBalance)).toBe(1000);
    accountId = res.body.id;
  });

  it('4. records an income transaction and updates the balance', async () => {
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        type: 'INCOME',
        amount: 2500,
        date: new Date().toISOString().split('T')[0],
        description: 'Salary',
        categoryId: categoryIncomeId,
      })
      .expect(201);

    const accRes = await request(app.getHttpServer())
      .get(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Number(accRes.body.currentBalance)).toBe(3500);
  });

  it('5. records an expense transaction and updates the balance', async () => {
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        type: 'EXPENSE',
        amount: 800,
        date: new Date().toISOString().split('T')[0],
        description: 'Rent',
        categoryId: categoryExpenseId,
      })
      .expect(201);

    const accRes = await request(app.getHttpServer())
      .get(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Number(accRes.body.currentBalance)).toBe(2700);
  });

  it('6. reports net worth = assets - liabilities', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/accounts/net-worth')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Number(res.body.totalNetWorth)).toBe(2700);
    expect(Number(res.body.totalAssets)).toBe(2700);
    expect(Number(res.body.totalLiabilities)).toBe(0);
  });

  it('7. creates a budget for the expense category', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        categoryId: categoryExpenseId,
        amount: 1000,
        currency: 'KES',
        period: 'MONTHLY',
      })
      .expect(201);

    expect(res.body).toBeDefined();

    const listRes = await request(app.getHttpServer())
      .get('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listRes.body.length).toBeGreaterThan(0);
    const created = listRes.body.find((b: any) => b.categoryId === categoryExpenseId);
    expect(created).toBeDefined();
    budgetId = created.id;
  });

  it('8. shows budget progress reflecting the recorded expense', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const budget = res.body.find((b: any) => b.id === budgetId);
    expect(budget).toBeDefined();
    expect(Number(budget.spent)).toBe(800);
    expect(Number(budget.remaining)).toBe(200);
  });

  it('9. creates a savings goal', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        name: 'Emergency Fund',
        targetAmount: 10000,
        currency: 'KES',
      })
      .expect(201);

    expect(res.body.name).toBe('Emergency Fund');
    goalId = res.body.id;
  });

  it('10. generates insights without error', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/insights/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(201);

    expect(res.body).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/insights')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('11. dashboard summary reflects the full user state', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.netWorth).toBeDefined();
    expect(res.body.cashFlow).toBeDefined();
  });

  it('12. audit log records the transaction creates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit?limit=50')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    const entityTypes = new Set(res.body.map((e: any) => e.entityType));
    expect(entityTypes.has('Transaction')).toBe(true);
  });

  it('13. logout revokes the current session', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken;
    const userId = loginRes.body.user.id;

    // Capture state before logout
    const sessionsBefore = await prisma.session.findMany({
      where: { userId, revokedAt: null },
    });
    const idsBefore = new Set(sessionsBefore.map((s) => s.id));

    // Logout
    await request(app.getHttpServer()).post('/api/auth/logout').send({ refreshToken }).expect(200);

    // Fetch sessions after
    const sessionsAfter = await prisma.session.findMany({
      where: { userId, revokedAt: null },
    });
    const idsAfter = new Set(sessionsAfter.map((s) => s.id));

    // Assert: one session was removed from the active list
    const revoked = [...idsBefore].filter((id) => !idsAfter.has(id));
    expect(revoked.length).toBeGreaterThanOrEqual(1);
  });
});
