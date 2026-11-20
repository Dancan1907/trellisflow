import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Wave 5.1 — External Business API (e2e)
 *
 * Exercises the public `/v1/*` API exactly as an external system would use it:
 * a user creates an external business in the dashboard, generates an API token,
 * then the "external site" authenticates with that token and pushes summaries.
 *
 * Note: this test app has no global prefix (same as the other e2e suites), so
 * routes are `/v1/...` here. In production they are served under `/api/v1/...`.
 */
describe('Wave 5 - External Business API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  const stamp = Date.now();
  const ownerEmail = `wave5-owner-${stamp}@trellisflow.test`;
  const strangerEmail = `wave5-stranger-${stamp}@trellisflow.test`;

  let ownerJwt: string;
  let strangerJwt: string;
  let businessId: string;
  let otherBusinessId: string;
  let apiToken: string; // raw token for `businessId`
  let apiTokenId: string;
  let otherApiToken: string; // raw token for `otherBusinessId`

  /** ISO date `n` days in the past (never "future", even around midnight). */
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

  const summary = (overrides: Record<string, unknown> = {}) => ({
    date: daysAgo(1),
    currency: 'KES',
    cashBalance: 12_500,
    assetsValue: 50_000,
    liabilitiesValue: 5_000,
    income: 5_000,
    expenses: 3_200,
    ...overrides,
  });

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror main.ts so DTO validation behaves like production.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    const owner = await http()
      .post('/auth/signup')
      .send({ email: ownerEmail, password: 'Password123!', name: 'Wave 5 Owner' });
    ownerJwt = owner.body.accessToken;

    const stranger = await http()
      .post('/auth/signup')
      .send({ email: strangerEmail, password: 'Password123!', name: 'Wave 5 Stranger' });
    strangerJwt = stranger.body.accessToken;

    const createBusiness = async (name: string) => {
      const res = await http()
        .post('/businesses')
        .set(bearer(ownerJwt))
        .send({ name, type: 'EXTERNAL_BUSINESS', businessType: 'FARMING', currency: 'KES' })
        .expect(201);
      return res.body.id as string;
    };

    businessId = await createBusiness('Wave 5 Farm');
    otherBusinessId = await createBusiness('Wave 5 Shop');
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: [ownerEmail, strangerEmail] } } });
    await app.close();
  });

  // ==========================================================================
  // Token management (dashboard side, JWT-protected)
  // ==========================================================================
  describe('token management', () => {
    it('creates a token and returns the raw value exactly once', async () => {
      const res = await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .send({ label: 'E2E token' })
        .expect(201);

      expect(res.body.token).toMatch(/^tf_live_[0-9a-f]{48}$/);
      expect(res.body.tokenPrefix).toBe(res.body.token.slice(0, 12));
      expect(res.body.message).toContain('Save this token securely');

      apiToken = res.body.token;
      apiTokenId = res.body.id;

      const other = await http()
        .post(`/businesses/${otherBusinessId}/tokens`)
        .set(bearer(ownerJwt))
        .send({ label: 'Other business token' })
        .expect(201);
      otherApiToken = other.body.token;
    });

    it('stores only a hash of the token, never the raw value', async () => {
      const stored = await prisma.apiToken.findUnique({ where: { id: apiTokenId } });

      expect(stored).not.toBeNull();
      expect(stored!.tokenHash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
      expect(stored!.tokenHash).not.toContain(apiToken);
      expect(JSON.stringify(stored)).not.toContain(apiToken);
    });

    it('lists tokens without exposing the raw token or its hash', async () => {
      const res = await http()
        .get(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: apiTokenId, label: 'E2E token', status: 'ACTIVE' });
      expect(res.body[0].token).toBeUndefined();
      expect(res.body[0].tokenHash).toBeUndefined();
    });

    it('requires a dashboard login to manage tokens', async () => {
      await http().post(`/businesses/${businessId}/tokens`).send({ label: 'x' }).expect(401);
      await http().get(`/businesses/${businessId}/tokens`).expect(401);
    });

    it("does not let another user create, list, or revoke someone else's tokens", async () => {
      await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(strangerJwt))
        .send({ label: 'sneaky' })
        .expect(404);

      await http()
        .patch(`/businesses/${businessId}/tokens/${apiTokenId}/revoke`)
        .set(bearer(strangerJwt))
        .expect(404);

      const list = await http()
        .get(`/businesses/${businessId}/tokens`)
        .set(bearer(strangerJwt))
        .expect(200);
      expect(list.body).toHaveLength(0);
    });

    it('rejects a token request without a label', async () => {
      await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .send({})
        .expect(400);
    });
  });

  // ==========================================================================
  // Authentication on the public API
  // ==========================================================================
  describe('authentication', () => {
    it('rejects requests with no Authorization header', async () => {
      await http().get('/v1/business').expect(401);
    });

    it('rejects a non-Bearer Authorization header', async () => {
      await http().get('/v1/business').set('Authorization', `Basic ${apiToken}`).expect(401);
    });

    it('rejects an unknown token', async () => {
      await http().get('/v1/business').set(bearer('tf_live_doesnotexist')).expect(401);
    });

    it('does not accept a dashboard JWT as an API token', async () => {
      await http().get('/v1/business').set(bearer(ownerJwt)).expect(401);
    });

    it('rejects an API token on dashboard (JWT) endpoints', async () => {
      await http().get('/businesses').set(bearer(apiToken)).expect(401);
    });
  });

  // ==========================================================================
  // GET /v1/business
  // ==========================================================================
  describe('GET /v1/business', () => {
    it('returns the business the token belongs to', async () => {
      const res = await http().get('/v1/business').set(bearer(apiToken)).expect(200);

      expect(res.body).toMatchObject({
        id: businessId,
        name: 'Wave 5 Farm',
        currency: 'KES',
        type: 'EXTERNAL_BUSINESS',
      });
      expect(res.body.tokenHash).toBeUndefined();
    });

    it('scopes each token to its own business', async () => {
      const res = await http().get('/v1/business').set(bearer(otherApiToken)).expect(200);
      expect(res.body.id).toBe(otherBusinessId);
      expect(res.body.name).toBe('Wave 5 Shop');
    });
  });

  // ==========================================================================
  // POST /v1/summary + GET /v1/summary/latest
  // ==========================================================================
  describe('single summary push', () => {
    let firstSummaryId: string;

    it('returns 404 for latest summary before anything has been pushed', async () => {
      await http().get('/v1/summary/latest').set(bearer(apiToken)).expect(404);
    });

    it('creates a summary and computes net worth', async () => {
      const res = await http()
        .post('/v1/summary')
        .set(bearer(apiToken))
        .send(summary({ unit: 'Farm #47' }))
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.netWorth).toBe(45_000); // 50,000 assets - 5,000 liabilities
      firstSummaryId = res.body.id;
    });

    it('returns the pushed summary from /v1/summary/latest', async () => {
      const res = await http().get('/v1/summary/latest').set(bearer(apiToken)).expect(200);

      expect(res.body.id).toBe(firstSummaryId);
      expect(res.body.netWorth).toBe(45_000);
    });

    it('is idempotent: re-sending the same (date, unit) returns the original', async () => {
      const res = await http()
        .post('/v1/summary')
        .set(bearer(apiToken))
        .send(summary({ unit: 'Farm #47' }))
        .expect(201);

      expect(res.body.id).toBe(firstSummaryId);
      expect(res.body.idempotent).toBe(true);

      const count = await prisma.summary.count({
        where: { containerId: businessId, deletedAt: null },
      });
      expect(count).toBe(1);
    });

    it('treats the same date with a different unit as a new summary', async () => {
      const res = await http()
        .post('/v1/summary')
        .set(bearer(apiToken))
        .send(summary({ unit: 'Farm #48', assetsValue: 20_000 }))
        .expect(201);

      expect(res.body.id).not.toBe(firstSummaryId);
      expect(res.body.idempotent).toBeUndefined();
      expect(res.body.netWorth).toBe(15_000);
    });

    it('keeps summaries isolated between businesses', async () => {
      // Business #2 has received nothing, even though business #1 has data.
      await http().get('/v1/summary/latest').set(bearer(otherApiToken)).expect(404);
    });
  });

  // ==========================================================================
  // Payload validation
  // ==========================================================================
  describe('payload validation', () => {
    const post = (body: Record<string, unknown>) =>
      http().post('/v1/summary').set(bearer(apiToken)).send(body);

    it('rejects negative income', async () => {
      await post(summary({ date: daysAgo(10), income: -1 })).expect(400);
    });

    it('rejects a missing required field', async () => {
      const { cashBalance: _omit, ...withoutCash } = summary({ date: daysAgo(10) });
      await post(withoutCash).expect(400);
    });

    it('rejects a malformed date', async () => {
      await post(summary({ date: 'not-a-date' })).expect(400);
    });

    it('rejects a date in the future', async () => {
      const tomorrow = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
      await post(summary({ date: tomorrow })).expect(400);
    });

    it('rejects a currency that does not match the business', async () => {
      const res = await post(summary({ date: daysAgo(10), currency: 'USD' })).expect(400);
      expect(JSON.stringify(res.body)).toContain('Currency must match');
    });

    it('rejects a malformed currency code', async () => {
      await post(summary({ date: daysAgo(10), currency: 'KENYA' })).expect(400);
    });

    it('rejects unknown fields', async () => {
      await post(summary({ date: daysAgo(10), hackerField: 'x' })).expect(400);
    });

    it('rejects notes longer than 500 characters', async () => {
      await post(summary({ date: daysAgo(10), notes: 'x'.repeat(501) })).expect(400);
    });

    it('rejects a unit longer than 64 characters', async () => {
      await post(summary({ date: daysAgo(10), unit: 'u'.repeat(65) })).expect(400);
    });

    it('does not persist anything for rejected payloads', async () => {
      const count = await prisma.summary.count({
        where: { containerId: businessId, date: new Date(daysAgo(10)) },
      });
      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // POST /v1/summary/bulk
  // ==========================================================================
  describe('bulk summary push', () => {
    const bulk = (summaries: unknown[]) =>
      http().post('/v1/summary/bulk').set(bearer(apiToken)).send({ summaries });

    const payload = () => [
      summary({ date: daysAgo(3), unit: 'bulk' }),
      summary({ date: daysAgo(4), unit: 'bulk', currency: 'USD' }), // invalid
      summary({ date: daysAgo(5), unit: 'bulk' }),
    ];

    it('accepts partial success: valid items are saved, invalid ones reported', async () => {
      const res = await bulk(payload()).expect(201);

      expect(res.body).toHaveLength(3);
      expect(res.body.map((r: { status: string }) => r.status)).toEqual([
        'success',
        'error',
        'success',
      ]);
      expect(res.body[1].message).toContain('Currency must match');
      expect(res.body[0].data.netWorth).toBe(45_000);
    });

    it('is idempotent: re-sending the same batch does not duplicate rows', async () => {
      const before = await prisma.summary.count({
        where: { containerId: businessId, unit: 'bulk', deletedAt: null },
      });

      const res = await bulk(payload()).expect(201);

      expect(res.body[0].status).toBe('success');
      expect(res.body[0].data.idempotent).toBe(true);
      expect(res.body[1].status).toBe('error');
      expect(res.body[2].data.idempotent).toBe(true);

      const after = await prisma.summary.count({
        where: { containerId: businessId, unit: 'bulk', deletedAt: null },
      });
      expect(after).toBe(before);
    });

    it('rejects an empty batch', async () => {
      await bulk([]).expect(400);
    });

    it('rejects a batch larger than 100 items', async () => {
      const tooMany = Array.from({ length: 101 }, (_, i) =>
        summary({ date: daysAgo(20), unit: `u-${i}` }),
      );
      await bulk(tooMany).expect(400);
    });

    it('rejects a body that is not wrapped in { summaries: [...] }', async () => {
      await http().post('/v1/summary/bulk').set(bearer(apiToken)).send([summary()]).expect(400);
    });
  });

  // ==========================================================================
  // Token lifecycle: expiry + revocation
  // ==========================================================================
  describe('token lifecycle', () => {
    it('rejects an expired token and marks it EXPIRED', async () => {
      const created = await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .send({ label: 'Already expired', expiresAt: '2020-01-01T00:00:00.000Z' })
        .expect(201);

      await http().get('/v1/business').set(bearer(created.body.token)).expect(401);

      const stored = await prisma.apiToken.findUnique({ where: { id: created.body.id } });
      expect(stored!.status).toBe('EXPIRED');
    });

    it('supports multiple active tokens for zero-downtime rotation', async () => {
      const second = await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .send({ label: 'Rotated token' })
        .expect(201);

      // Old and new tokens both work at the same time.
      await http().get('/v1/business').set(bearer(apiToken)).expect(200);
      await http().get('/v1/business').set(bearer(second.body.token)).expect(200);

      // Revoke the OLD token; the NEW one keeps working.
      await http()
        .patch(`/businesses/${businessId}/tokens/${apiTokenId}/revoke`)
        .set(bearer(ownerJwt))
        .expect(200);

      await http().get('/v1/business').set(bearer(apiToken)).expect(401);
      await http().get('/v1/business').set(bearer(second.body.token)).expect(200);
    });

    it('blocks every endpoint for a revoked token', async () => {
      await http().get('/v1/summary/latest').set(bearer(apiToken)).expect(401);
      await http().post('/v1/summary').set(bearer(apiToken)).send(summary()).expect(401);
      await http()
        .post('/v1/summary/bulk')
        .set(bearer(apiToken))
        .send({ summaries: [summary()] })
        .expect(401);
    });

    it('records revocation details on the token', async () => {
      const stored = await prisma.apiToken.findUnique({ where: { id: apiTokenId } });
      expect(stored!.status).toBe('REVOKED');
      expect(stored!.revokedAt).toBeInstanceOf(Date);
    });

    it('keeps historical summaries after the token is revoked', async () => {
      const count = await prisma.summary.count({
        where: { containerId: businessId, deletedAt: null },
      });
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Rate limiting (kept last: it exhausts the throttle bucket)
  // ==========================================================================
  describe('rate limiting', () => {
    it('eventually answers 429 when the limit is exceeded', async () => {
      const statuses: number[] = [];

      // Controller limit is 60 requests / minute. Earlier tests already used part of it.
      for (let i = 0; i < 70; i++) {
        const res = await http().get('/v1/business').set(bearer(otherApiToken));
        statuses.push(res.status);
        if (res.status === 429) break;
      }

      expect(statuses).toContain(429);
      expect(statuses.filter((s) => s === 200).length).toBeLessThanOrEqual(60);
    }, 60_000);
  });
});
