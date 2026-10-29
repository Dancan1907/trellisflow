import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Wave 1 Golden Path — the single most important E2E test in the project.
 */
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
    // Cascade-deletes all containers, accounts, transactions, budgets, goals, insights
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'wave1-e2e-' } },
    });
    await app.close();
  });

  // ============================================================================
  // 1. Signup
  // ============================================================================
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

  // ============================================================================
  // 2. Default data (categories + Personal container)
  // ============================================================================
  it('2. auto-creates a Personal container and default categories', async () => {
    // Categories
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

    // Container
    const contRes = await request(app.getHttpServer())
      .get('/api/containers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(contRes.body.length).toBeGreaterThanOrEqual(1);
    const personal = contRes.body.find((c: any) => c.type === 'PERSONAL');
    expect(personal).toBeDefined();
    expect(personal.name).toBe('Personal');

    // Save the container ID for the budget step!
    containerId = personal.id;
  });

  // ============================================================================
  // 3. Create a bank account
  // ============================================================================
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

  // ============================================================================
  // 4. Add income (2500) → balance becomes 3500
  // ============================================================================
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

  // ============================================================================
  // 5. Add expense (800) → balance becomes 2700
  // ============================================================================
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

  // ============================================================================
  // 6. Verify net worth endpoint
  // ============================================================================
  it('6. reports net worth = assets - liabilities', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/accounts/net-worth')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Number(res.body.totalNetWorth)).toBe(2700);
    expect(Number(res.body.totalAssets)).toBe(2700);
    expect(Number(res.body.totalLiabilities)).toBe(0);
  });

  // ============================================================================
  // 7. Create a budget for the expense category (Now includes containerId!)
  // ============================================================================
  it('7. creates a budget for the expense category', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId, // <-- THE FIX: Added containerId
        categoryId: categoryExpenseId,
        amount: 1000,
        currency: 'KES',
        period: 'MONTHLY',
      })
      .expect(201);

    expect(res.body).toBeDefined();

    // Fetch list to find the created budget's id
    const listRes = await request(app.getHttpServer())
      .get('/api/budgets')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listRes.body.length).toBeGreaterThan(0);
    const created = listRes.body.find((b: any) => b.categoryId === categoryExpenseId);
    expect(created).toBeDefined();
    budgetId = created.id;
  });

  // ============================================================================
  // 8. Budget progress reflects the 800 expense
  // ============================================================================
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

  // ============================================================================
  // 9. Create a savings goal
  // ============================================================================
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

  // ============================================================================
  // 10. Generate insights
  // ============================================================================
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

  // ============================================================================
  // 11. Dashboard aggregates everything
  // ============================================================================
  it('11. dashboard summary reflects the full user state', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toBeDefined();
    expect(res.body.netWorth).toBeDefined();
    expect(res.body.cashFlow).toBeDefined();
  });

  // ============================================================================
  // 12. Audit log contains our writes
  // ============================================================================
  it('12. audit log records the transaction creates', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit?limit=50')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // We created 2 transactions, so we expect at least 2 logs
    expect(res.body.length).toBeGreaterThanOrEqual(2);

    const entityTypes = new Set(res.body.map((e: any) => e.entityType));
    expect(entityTypes.has('Transaction')).toBe(true);
  });

  // ============================================================================
  // 13. Logout revokes the session
  // ============================================================================
  it('13. logout invalidates the access token', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken;

    await request(app.getHttpServer()).post('/api/auth/logout').send({ refreshToken }).expect(200);

    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401);
  });
});
