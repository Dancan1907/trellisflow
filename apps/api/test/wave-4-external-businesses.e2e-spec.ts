import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wave 4 - External Businesses (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let businessId: string;
  const testEmail = `wave4-e2e-${Date.now()}@trellisflow.test`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // 1. Create a user and get a token
    const signupRes = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: testEmail, password: 'Password123!', name: 'Wave 4 Tester' });
    authToken = signupRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app.close();
  });

  it('Golden Path: Create External Business -> Add Summary -> Snapshot Net Worth', async () => {
    // 2. Create an External Business
    const createRes = await request(app.getHttpServer())
      .post('/businesses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Sugarcane Farm E2E',
        type: 'EXTERNAL_BUSINESS',
        businessType: 'FARMING',
        currency: 'KES',
      })
      .expect(201);

    businessId = createRes.body.id;
    expect(createRes.body.type).toBe('EXTERNAL_BUSINESS');

    // 3. Add a Manual Summary
    const summaryRes = await request(app.getHttpServer())
      .post(`/businesses/${businessId}/summaries`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: new Date().toISOString().slice(0, 10),
        currency: 'KES',
        cashBalance: 12500,
        assetsValue: 50000,
        liabilitiesValue: 5000,
        income: 5000,
        expenses: 3200,
        unit: 'Farm E2E',
      })
      .expect(201);

    expect(summaryRes.body.netWorth).toBe(45000); // 50000 - 5000

    // 4. Verify Net Worth Snapshot was updated
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    const snapshot = await prisma.netWorthSnapshot.findFirst({
      where: { userId: user!.id },
      orderBy: { createdAt: 'desc' },
    });

    expect(Number(snapshot?.businessesNetWorth)).toBe(45000);
    expect(Number(snapshot?.totalNetWorth)).toBe(45000);

    // 5. Correct the Summary (Versioning)
    const correctRes = await request(app.getHttpServer())
      .patch(`/summaries/${summaryRes.body.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        assetsValue: 60000,
        reason: 'Found extra assets',
      })
      .expect(200);

    expect(correctRes.body.netWorth).toBe(55000); // 60000 - 5000
    expect(correctRes.body.versionNumber).toBe(1);

    // 6. Verify Version History
    const versionsRes = await request(app.getHttpServer())
      .get(`/summaries/${summaryRes.body.id}/versions`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(versionsRes.body).toHaveLength(1);
    expect(versionsRes.body[0].reason).toBe('Found extra assets');
    expect(versionsRes.body[0].snapshot.assetsValue).toBe(50000); // Old value preserved
  });
});
