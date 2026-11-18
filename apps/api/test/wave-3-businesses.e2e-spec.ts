import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wave 3 — Internal Businesses Golden Path (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let businessId: string;
  let accountId: string;
  let incomeCategoryId: string;
  let expenseCategoryId: string;

  const testEmail = `wave3-e2e-${Date.now()}@trellisflow.com`;
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
      where: { email: { startsWith: 'wave3-e2e-' } },
    });
    await app.close();
  });

  it('1. signs up a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: testPassword, name: 'Wave 3 Business Owner' })
      .expect(201);

    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('2. creates an internal business with a profile and default categories', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/businesses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Westlands Corner Shop',
        businessType: 'RETAIL',
        currency: 'KES',
        startDate: '2026-01-15',
        notes: 'E2E business',
      })
      .expect(201);

    expect(res.body.name).toBe('Westlands Corner Shop');
    expect(res.body.categoriesCreated).toBe(14);
    expect(res.body.businessProfile.businessType).toBe('RETAIL');
    businessId = res.body.id;
  });

  it('3. returns only the business categories when filtered by containerId', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/categories?flat=true')
      .query({ containerId: businessId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveLength(14);
    expect(
      res.body.every((category: { containerId: string }) => category.containerId === businessId),
    ).toBe(true);

    const income = res.body.find((category: { type: string }) => category.type === 'INCOME');
    const expense = res.body.find((category: { type: string }) => category.type === 'EXPENSE');
    expect(income).toBeDefined();
    expect(expense).toBeDefined();
    incomeCategoryId = income.id;
    expenseCategoryId = expense.id;
  });

  it('4. creates a business account', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId: businessId,
        name: 'Shop Till',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        initialBalance: 10000,
      })
      .expect(201);

    expect(res.body.name).toBe('Shop Till');
    expect(Number(res.body.currentBalance)).toBe(10000);
    accountId = res.body.id;
  });

  it('5. records income and an expense against the business account', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'INCOME',
        amount: 4000,
        date: today,
        description: 'Counter sales',
        accountId,
        categoryId: incomeCategoryId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'EXPENSE',
        amount: 1500,
        date: today,
        description: 'Stock purchase',
        accountId,
        categoryId: expenseCategoryId,
      })
      .expect(201);

    const account = await request(app.getHttpServer())
      .get(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Number(account.body.currentBalance)).toBe(12500);
  });

  it('6. returns net worth from the business accounts', async () => {
    const detail = await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(detail.body.accountCount).toBe(1);
    expect(detail.body.netWorth.netWorth).toBe(12500);

    const res = await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}/net-worth`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toMatchObject({
      businessId,
      totalAssets: 12500,
      totalLiabilities: 0,
      netWorth: 12500,
      currency: 'KES',
    });
  });

  it('7. computes P&L from real transactions', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}/pnl`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.totalIncome).toBe(4000);
    expect(res.body.totalExpenses).toBe(1500);
    expect(res.body.netProfit).toBe(2500);
    expect(res.body.byCategory).toHaveLength(2);
  });

  it('8. computes cash runway from liquid cash and expenses', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}/runway`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.cashBalance).toBe(12500);
    expect(res.body.monthlyBurn).toBe(500);
    expect(res.body.runwayMonths).toBe(25);
  });

  it('9. lists only this business’s transactions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/transactions')
      .query({ containerId: businessId })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.items).toHaveLength(2);
    expect(
      res.body.items.every(
        (transaction: { containerId: string }) => transaction.containerId === businessId,
      ),
    ).toBe(true);
  });

  it('10. updates the business name and profile', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/businesses/${businessId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Westlands Shop', businessType: 'SERVICE', notes: 'Updated' })
      .expect(200);

    expect(res.body.name).toBe('Westlands Shop');
    expect(res.body.businessProfile.businessType).toBe('SERVICE');
    expect(res.body.businessProfile.notes).toBe('Updated');
  });

  it('11. hides the business from another user', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: `wave3-e2e-other-${Date.now()}@trellisflow.com`,
        password: testPassword,
        name: 'Other User',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}`)
      .set('Authorization', `Bearer ${other.body.accessToken}`)
      .expect(404);
  });

  it('12. archives the business', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/businesses/${businessId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.status).toBe('ARCHIVED');

    await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    const list = await request(app.getHttpServer())
      .get('/api/businesses')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(
      list.body.find((business: { id: string }) => business.id === businessId),
    ).toBeUndefined();
  });
});
