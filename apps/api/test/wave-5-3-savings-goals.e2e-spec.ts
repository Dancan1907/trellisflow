import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wave 5.3 — Savings Goals Advanced (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let personalContainerId: string;
  let goalId: string;
  let linkedGoalId: string;

  const testEmail = `wave5-3-e2e-${Date.now()}@trellisflow.com`;
  const testPassword = 'password123';

  const isoDate = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

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
      where: { email: { startsWith: 'wave5-3-e2e-' } },
    });
    await app.close();
  });

  it('1. signs up and finds the auto-created Personal container', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: testPassword, name: 'Wave 5.3 Saver' })
      .expect(201);
    accessToken = res.body.accessToken;
    expect(accessToken).toBeDefined();

    const containers = await request(app.getHttpServer())
      .get('/api/dashboard/containers')
      .set(auth())
      .expect(200);

    const personal = containers.body.find((c: { type: string }) => c.type === 'PERSONAL');
    expect(personal).toBeDefined();
    personalContainerId = personal.id;
  });

  it('2. creates a manual goal with a deadline a year away', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({
        name: 'Emergency Fund',
        targetAmount: 10000,
        currency: 'KES',
        containerId: personalContainerId,
        targetDate: isoDate(365),
      })
      .expect(201);

    goalId = res.body.id;
    expect(goalId).toBeDefined();
  });

  it('3. records contributions and reflects them in progress', async () => {
    await request(app.getHttpServer())
      .post(`/api/goals/${goalId}/contributions`)
      .set(auth())
      .send({ amount: 1000, date: isoDate(-60), note: 'First deposit' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/goals/${goalId}/contributions`)
      .set(auth())
      .send({ amount: 2000, date: isoDate(0) })
      .expect(201);

    const list = await request(app.getHttpServer()).get('/api/goals').set(auth()).expect(200);
    const goal = list.body.find((g: { id: string }) => g.id === goalId);

    expect(goal.currentAmount).toBe(3000);
    expect(goal.remaining).toBe(7000);
    expect(goal.percentage).toBe(30);
  });

  it('4. projects a completion date ahead of the deadline', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/goals/${goalId}`)
      .set(auth())
      .expect(200);

    expect(res.body.projection.status).toBe('ON_TRACK');
    expect(res.body.projection.projectedCompletionDate).toEqual(expect.any(String));
    expect(res.body.projection.daysAhead).toBeGreaterThan(0);
    expect(res.body.projection.dailyRate).toBeGreaterThan(0);
  });

  it('5. returns a history that ends at the saved amount', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/goals/${goalId}/history`)
      .set(auth())
      .expect(200);

    expect(res.body.mode).toBe('manual');
    expect(res.body.targetAmount).toBe(10000);
    expect(res.body.currentAmount).toBe(3000);

    const { history } = res.body;
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].amount).toBe(0);
    expect(history[history.length - 1].amount).toBe(3000);
  });

  it('6. rejects a withdrawal larger than the saved amount and a zero amount', async () => {
    await request(app.getHttpServer())
      .post(`/api/goals/${goalId}/contributions`)
      .set(auth())
      .send({ amount: -99999 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/goals/${goalId}/contributions`)
      .set(auth())
      .send({ amount: 0 })
      .expect(400);

    const res = await request(app.getHttpServer())
      .get(`/api/goals/${goalId}`)
      .set(auth())
      .expect(200);
    expect(res.body.currentAmount).toBe(3000);
  });

  it('7. raises a 25% milestone insight once, and not again on re-run', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/insights/generate')
      .set(auth())
      .expect(201);
    expect(first.body.created).toBeGreaterThanOrEqual(1);

    const insights = await request(app.getHttpServer())
      .get('/api/insights')
      .set(auth())
      .expect(200);
    const milestones = insights.body.filter(
      (i: { type: string; relatedEntityId: string }) =>
        i.type === 'GOAL_MILESTONE' && i.relatedEntityId === goalId,
    );
    expect(milestones).toHaveLength(1);
    expect(milestones[0].metadata.milestone).toBe(25);

    const second = await request(app.getHttpServer())
      .post('/api/insights/generate')
      .set(auth())
      .expect(201);
    expect(second.body.created).toBe(0);
  });

  it('8. links a goal to an account: history matches the balance, contributions are refused', async () => {
    const account = await request(app.getHttpServer())
      .post('/api/accounts')
      .set(auth())
      .send({
        containerId: personalContainerId,
        name: 'Savings Pot',
        category: 'ASSET',
        accountType: 'SAVINGS',
        currency: 'KES',
        initialBalance: 5000,
      })
      .expect(201);

    const goal = await request(app.getHttpServer())
      .post('/api/goals')
      .set(auth())
      .send({
        name: 'Linked Goal',
        targetAmount: 20000,
        currency: 'KES',
        containerId: personalContainerId,
        linkedAccountId: account.body.id,
      })
      .expect(201);
    linkedGoalId = goal.body.id;

    const history = await request(app.getHttpServer())
      .get(`/api/goals/${linkedGoalId}/history`)
      .set(auth())
      .expect(200);

    expect(history.body.mode).toBe('linked');
    expect(history.body.currentAmount).toBe(5000);
    const points = history.body.history;
    expect(points[points.length - 1].amount).toBe(5000);

    await request(app.getHttpServer())
      .post(`/api/goals/${linkedGoalId}/contributions`)
      .set(auth())
      .send({ amount: 100 })
      .expect(400);
  });

  it('9. hides goals, history and contributions from another user', async () => {
    const other = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email: `wave5-3-e2e-other-${Date.now()}@trellisflow.com`,
        password: testPassword,
        name: 'Other User',
      })
      .expect(201);
    const otherAuth = { Authorization: `Bearer ${other.body.accessToken}` };

    await request(app.getHttpServer()).get(`/api/goals/${goalId}`).set(otherAuth).expect(404);
    await request(app.getHttpServer())
      .get(`/api/goals/${goalId}/history`)
      .set(otherAuth)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/goals/${goalId}/contributions`)
      .set(otherAuth)
      .send({ amount: 100 })
      .expect(404);

    const list = await request(app.getHttpServer()).get('/api/goals').set(otherAuth).expect(200);
    expect(list.body).toHaveLength(0);
  });
});
