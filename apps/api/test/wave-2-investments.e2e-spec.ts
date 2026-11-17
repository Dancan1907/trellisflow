import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wave 2 — Investments Golden Path (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let containerId: string;
  let accountId: string;
  let holdingId: string;

  const testEmail = `wave2-e2e-${Date.now()}@trellisflow.com`;
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
      where: { email: { startsWith: 'wave2-e2e-' } },
    });
    await app.close();
  });

  it('1. signs up a new user and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: testPassword, name: 'Wave 2 Investor' })
      .expect(201);

    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('2. creates an INVESTMENT container', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/containers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ type: 'INVESTMENT', name: 'My Portfolio', currency: 'KES' })
      .expect(201);

    expect(res.body.type).toBe('INVESTMENT');
    containerId = res.body.id;
  });

  it('3. creates a linked investment account', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        name: 'Brokerage Account',
        category: 'ASSET',
        accountType: 'INVESTMENT_ACCOUNT',
        currency: 'KES',
        initialBalance: 100000,
      })
      .expect(201);

    expect(res.body.name).toBe('Brokerage Account');
    expect(Number(res.body.currentBalance)).toBe(100000);
    accountId = res.body.id;
  });

  it('4. creates a holding linked to the account', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/holdings')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        accountId,
        name: 'Safaricom Stock',
        assetClass: 'STOCK',
        symbol: 'SCOM',
        quantity: 100,
        costBasisTotal: 15000,
        currentValueTotal: 18000,
        currency: 'KES',
      })
      .expect(201);

    expect(res.body.name).toBe('Safaricom Stock');
    expect(res.body.accountId).toBe(accountId);
    holdingId = res.body.id;
  });

  it('5. processes a BUY event and updates the holding + account balance', async () => {
    const beforeAccount = await request(app.getHttpServer())
      .get(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const balanceBefore = Number(beforeAccount.body.currentBalance);

    await request(app.getHttpServer())
      .post('/api/investment-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        holdingId,
        eventType: 'BUY',
        quantity: 50,
        totalAmount: 10000,
        currency: 'KES',
        date: '2026-11-01',
      })
      .expect(201);

    // Verify the holding updated
    const holdingRes = await request(app.getHttpServer())
      .get(`/api/holdings/${holdingId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Number(holdingRes.body.quantity)).toBe(150);
    expect(Number(holdingRes.body.costBasisTotal)).toBe(25000);

    // Verify the linked transaction reversed the account balance
    const afterAccount = await request(app.getHttpServer())
      .get(`/api/accounts/${accountId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Number(afterAccount.body.currentBalance)).toBe(balanceBefore - 10000);
  });

  it('6. processes a SELL event and calculates realized gain', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/investment-events')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        holdingId,
        eventType: 'SELL',
        quantity: 20,
        totalAmount: 4000,
        currency: 'KES',
        date: '2026-11-02',
      })
      .expect(201);

    // Average cost per share before sell: 25,000 / 150 = 166.67
    // Cost basis removed: 20 * 166.67 = 3,333.40
    // Realized gain: 4,000 - 3,333.40 = 666.60
    expect(Number(res.body.realizedGain)).toBeCloseTo(666.67, 1);

    // Verify holding after sell
    const holdingRes = await request(app.getHttpServer())
      .get(`/api/holdings/${holdingId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Number(holdingRes.body.quantity)).toBe(130);
  });

  it('7. returns portfolio allocation breakdown', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/holdings/allocation')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.totalValue).toBeGreaterThan(0);
    expect(Array.isArray(res.body.breakdown)).toBe(true);
    expect(res.body.breakdown[0].assetClass).toBe('STOCK');
  });

  it('8. returns performance over time', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/holdings/performance?days=30')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    // For a fresh user, we may or may not have snapshots yet — either is fine
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('date');
      expect(res.body[0]).toHaveProperty('investmentsValue');
      expect(res.body[0]).toHaveProperty('totalValue');
    }
  });

  it('9. rejects invalid days parameter', async () => {
    await request(app.getHttpServer())
      .get('/api/holdings/performance?days=400')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });
});
