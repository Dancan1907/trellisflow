import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { SnapshotsService } from '../src/modules/snapshots/snapshots.service';

describe('Wave 5.6 — Internal → External Conversion (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let businessId: string;
  let assetAccountId: string;

  const testEmail = `wave56-e2e-${Date.now()}@trellisflow.com`;
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
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'wave56-e2e-' } },
    });
    await app.close();
  });

  it('1. signs up a user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: testPassword, name: 'Wave 5.6 E2E' })
      .expect(201);

    accessToken = res.body.accessToken;
    userId = res.body.user.id;
    expect(accessToken).toBeDefined();
    expect(userId).toBeDefined();
  });

  it('2. creates an internal business with accounts and an income transaction', async () => {
    // Create the business — `type` defaults to INTERNAL_BUSINESS
    const businessRes = await request(app.getHttpServer())
      .post('/api/businesses')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Sugarcane Farm',
        currency: 'KES',
        businessType: 'FARMING',
      })
      .expect(201);

    businessId = businessRes.body.id;
    expect(businessRes.body.type).toBe('INTERNAL_BUSINESS');

    // Asset account — `initialBalance` per CreateAccountDto
    const assetRes = await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId: businessId,
        name: 'Farm Checking',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        initialBalance: 120000,
      })
      .expect(201);
    assetAccountId = assetRes.body.id;

    // Liability account
    await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId: businessId,
        name: 'Tractor Loan',
        category: 'LIABILITY',
        accountType: 'PERSONAL_LOAN',
        currency: 'KES',
        initialBalance: 30000,
      })
      .expect(201);

    // Income transaction — containerId is derived from the account
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId: assetAccountId,
        type: 'INCOME',
        amount: 5000,
        date: new Date().toISOString().split('T')[0],
        description: 'Harvest sale',
      })
      .expect(201);

    // Sanity: 120k + 5k = 125k assets, 30k liabilities → 95k net worth
    const nwRes = await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}/net-worth`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(Number(nwRes.body.netWorth)).toBe(95000);
  });

  it('3. converts internal → external and preserves net worth via the seed summary', async () => {
    const convertRes = await request(app.getHttpServer())
      .post(`/api/businesses/${businessId}/convert-to-external`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    expect(convertRes.body.type).toBe('EXTERNAL_BUSINESS');
    expect(convertRes.body.seedSummary.netWorth).toBe(95000);

    const container = await prisma.container.findUniqueOrThrow({ where: { id: businessId } });
    expect(container.type).toBe('EXTERNAL_BUSINESS');

    const source = await prisma.externalBusinessSource.findUniqueOrThrow({
      where: { containerId: businessId },
    });
    expect(source.sourceType).toBe('MANUAL');

    const accounts = await prisma.account.findMany({ where: { containerId: businessId } });
    expect(accounts).toHaveLength(2);
    expect(accounts.every((a) => a.status === 'ARCHIVED')).toBe(true);

    const txCount = await prisma.transaction.count({ where: { containerId: businessId } });
    expect(txCount).toBe(1);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const seed = await prisma.summary.findFirstOrThrow({
      where: { containerId: businessId, date: today, deletedAt: null },
    });
    expect(Number(seed.assetsValue)).toBe(125000);
    expect(Number(seed.liabilitiesValue)).toBe(30000);

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'container', entityId: businessId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit).not.toBeNull();
    expect(audit!.changedFields).toContain('type');

    // P&L rejects external businesses
    await request(app.getHttpServer())
      .get(`/api/businesses/${businessId}/pnl`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    // Idempotency: second convert rejected
    await request(app.getHttpServer())
      .post(`/api/businesses/${businessId}/convert-to-external`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400);
  });

  it('4. keeps trend continuity in the daily snapshot after conversion', async () => {
    const snapshotsService = app.get(SnapshotsService);
    await snapshotsService.computeAndSaveForUser(userId);

    const snapshot = await prisma.netWorthSnapshot.findFirstOrThrow({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // businessesNetWorth = 125k assets − 30k liabilities = 95k.
    // If continuity broke, external business with no summary contributes 0
    // and this would fail — that's the regression guard.
    expect(Number(snapshot.businessesNetWorth)).toBe(95000);
  });
});
