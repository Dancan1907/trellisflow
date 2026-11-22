import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Audit filters (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let containerId: string;
  let accountId: string;
  let categoryId: string;

  const email = `audit-filters-${Date.now()}@trellisflow.test`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
    await app.init();
    prisma = app.get(PrismaService);

    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Audit Filters E2E' })
      .expect(201);
    accessToken = signup.body.accessToken;
    userId = signup.body.user.id;

    // Personal container
    const containers = await request(app.getHttpServer())
      .get('/api/containers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    containerId = containers.body.find((c: any) => c.type === 'PERSONAL').id;

    // Account (setup only — not asserted via audit)
    const account = await request(app.getHttpServer())
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        containerId,
        name: 'Audit Testing Account',
        category: 'ASSET',
        accountType: 'CHECKING',
        currency: 'KES',
        initialBalance: 10000,
      })
      .expect(201);
    accountId = account.body.id;

    // Category (setup only — not asserted via audit)
    const categories = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const income = categories.body.find((c: any) => c.type === 'INCOME');
    categoryId = income.id;

    // Two transactions — these ARE audited
    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        type: 'INCOME',
        amount: 5000,
        date: new Date().toISOString().split('T')[0],
        description: 'Audit fixture income',
        categoryId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        accountId,
        type: 'EXPENSE',
        amount: 1000,
        date: new Date().toISOString().split('T')[0],
        description: 'Audit fixture expense',
        categoryId,
      })
      .expect(201);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'audit-filters-' } } });
    await app.close();
  });

  it('returns a paginated envelope', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit?limit=10&offset=0')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('filters by entityType', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit?entityType=Transaction')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items.every((e: any) => e.entityType === 'Transaction')).toBe(true);
  });

  it('filters by entityId', async () => {
    // Use the entityId of the first transaction-level audit row for this user
    const first = await prisma.auditLog.findFirst({
      where: { userId, entityType: 'Transaction' },
    });
    expect(first).not.toBeNull();

    const res = await request(app.getHttpServer())
      .get(`/api/audit?entityType=Transaction&entityId=${first!.entityId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items.every((e: any) => e.entityId === first!.entityId)).toBe(true);
  });

  it('filters by action', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit?action=CREATE')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items.every((e: any) => e.action === 'CREATE')).toBe(true);
  });

  it('filters by date range — future range returns zero', async () => {
    const from = new Date(Date.now() + 86_400_000).toISOString();
    const res = await request(app.getHttpServer())
      .get(`/api/audit?from=${encodeURIComponent(from)}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.items.length).toBe(0);
    expect(res.body.total).toBe(0);
  });
});
