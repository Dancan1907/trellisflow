import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Setup does 2 signups + 2 business creates against a remote DB, which can exceed the
// 15s default from jest-e2e.json. Several tests also make multiple sequential requests.
jest.setTimeout(90_000);

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
  }, 120_000);

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
  // Token rotation + expiry warnings
  // ==========================================================================
  describe('token rotation and expiry warnings', () => {
    const DAY = 86_400_000;
    const rotateUrl = (tokenId: string) => `/businesses/${businessId}/tokens/${tokenId}/rotate`;

    const newToken = async (body: Record<string, unknown> = { label: 'Rotation subject' }) => {
      const res = await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .send(body)
        .expect(201);
      return { id: res.body.id as string, token: res.body.token as string };
    };

    it('rotates with a grace period: both tokens work, the old one is shortened', async () => {
      const old = await newToken();

      const res = await http()
        .post(rotateUrl(old.id))
        .set(bearer(ownerJwt))
        .send({ gracePeriodHours: 2 })
        .expect(201);

      expect(res.body.token).toMatch(/^tf_live_[0-9a-f]{48}$/);
      expect(res.body.token).not.toBe(old.token);
      expect(res.body.label).toBe('Rotation subject'); // inherited from the old token
      expect(res.body.previousToken).toMatchObject({ id: old.id, status: 'ACTIVE' });

      // Old token now expires within the 2h grace window instead of its original lifetime.
      const stored = await prisma.apiToken.findUnique({ where: { id: old.id } });
      const msLeft = stored!.expiresAt.getTime() - Date.now();
      expect(msLeft).toBeGreaterThan(0);
      expect(msLeft).toBeLessThanOrEqual(2 * 3_600_000);

      // Zero downtime: both tokens authenticate during the hand-over.
      await http().get('/v1/business').set(bearer(old.token)).expect(200);
      await http().get('/v1/business').set(bearer(res.body.token)).expect(200);
    });

    it('revokes the old token immediately when gracePeriodHours is 0', async () => {
      const old = await newToken();

      const res = await http()
        .post(rotateUrl(old.id))
        .set(bearer(ownerJwt))
        .send({ gracePeriodHours: 0 })
        .expect(201);

      expect(res.body.previousToken.status).toBe('REVOKED');
      await http().get('/v1/business').set(bearer(old.token)).expect(401);
      await http().get('/v1/business').set(bearer(res.body.token)).expect(200);

      const stored = await prisma.apiToken.findUnique({ where: { id: old.id } });
      expect(stored!.status).toBe('REVOKED');
      expect(stored!.revokedReason).toBe('Replaced by rotated token');
    });

    it('allows a new label and expiry on the rotated token', async () => {
      const old = await newToken();
      const expiresAt = new Date(Date.now() + 30 * DAY).toISOString();

      const res = await http()
        .post(rotateUrl(old.id))
        .set(bearer(ownerJwt))
        .send({ label: 'Renamed', expiresAt })
        .expect(201);

      expect(res.body.label).toBe('Renamed');
      expect(new Date(res.body.expiresAt).toISOString()).toBe(expiresAt);
    });

    it('refuses to rotate a revoked token', async () => {
      const old = await newToken();
      await http()
        .patch(`/businesses/${businessId}/tokens/${old.id}/revoke`)
        .set(bearer(ownerJwt))
        .expect(200);

      await http().post(rotateUrl(old.id)).set(bearer(ownerJwt)).send({}).expect(400);
    });

    it('validates the rotation payload', async () => {
      const old = await newToken();
      const rotate = (body: Record<string, unknown>) =>
        http().post(rotateUrl(old.id)).set(bearer(ownerJwt)).send(body);

      await rotate({ gracePeriodHours: -1 }).expect(400);
      await rotate({ gracePeriodHours: 1000 }).expect(400); // max is 168h
      await rotate({ expiresAt: '2020-01-01T00:00:00.000Z' }).expect(400); // in the past
      await rotate({ unknownField: true }).expect(400);
    });

    it("does not let another user rotate someone else's token", async () => {
      const old = await newToken();
      await http().post(rotateUrl(old.id)).set(bearer(strangerJwt)).send({}).expect(404);

      // The token is untouched and still works.
      await http().get('/v1/business').set(bearer(old.token)).expect(200);
    });

    it('requires a dashboard login to rotate', async () => {
      const old = await newToken();
      await http().post(rotateUrl(old.id)).send({}).expect(401);
    });

    it('returns X-Token-Expires-At but no warning for a long-lived token', async () => {
      const long = await newToken({ label: 'Long lived' });
      const res = await http().get('/v1/business').set(bearer(long.token)).expect(200);

      expect(res.headers['x-token-expires-at']).toBeDefined();
      expect(res.headers['x-token-expiry-warning']).toBeUndefined();
    });

    it('warns via response header when the token expires within 14 days', async () => {
      const soon = await newToken({
        label: 'Expiring soon',
        expiresAt: new Date(Date.now() + 5 * DAY).toISOString(),
      });

      const res = await http().get('/v1/business').set(bearer(soon.token)).expect(200);
      expect(res.headers['x-token-expiry-warning']).toMatch(/expires in [1-5] day/);
    });

    it('flags expiring tokens in the dashboard list', async () => {
      const list = await http()
        .get(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .expect(200);

      const expiring = list.body.find((t: { label: string }) => t.label === 'Expiring soon');
      expect(expiring.expiringSoon).toBe(true);
      expect(expiring.expiresInDays).toBeLessThanOrEqual(5);

      const longLived = list.body.find((t: { label: string }) => t.label === 'Long lived');
      expect(longLived.expiringSoon).toBe(false);
    });

    it('does not leak the token hash when revoking', async () => {
      const t = await newToken();
      const res = await http()
        .patch(`/businesses/${businessId}/tokens/${t.id}/revoke`)
        .set(bearer(ownerJwt))
        .expect(200);

      expect(res.body.status).toBe('REVOKED');
      expect(res.body.tokenHash).toBeUndefined();
    });
  });

  // ==========================================================================
  // Idempotency-Key header
  // ==========================================================================
  describe('Idempotency-Key header', () => {
    let keyToken: string;
    let otherKeyToken: string;

    beforeAll(async () => {
      const mk = async (id: string) => {
        const res = await http()
          .post(`/businesses/${id}/tokens`)
          .set(bearer(ownerJwt))
          .send({ label: 'Idempotency token' })
          .expect(201);
        return res.body.token as string;
      };
      keyToken = await mk(businessId);
      otherKeyToken = await mk(otherBusinessId);
    }, 60_000);

    const send = (token: string, key: string | undefined, body: Record<string, unknown>) => {
      const req = http().post('/v1/summary').set(bearer(token));
      if (key !== undefined) req.set('Idempotency-Key', key);
      return req.send(body);
    };

    it('replays the original response for the same key and payload', async () => {
      const key = randomUUID();
      const payload = summary({ date: daysAgo(30), unit: 'idem-1' });

      const first = await send(keyToken, key, payload).expect(201);
      expect(first.headers['idempotent-replayed']).toBeUndefined();

      const second = await send(keyToken, key, payload).expect(201);
      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body).toEqual(first.body);

      const count = await prisma.summary.count({
        where: { containerId: businessId, unit: 'idem-1', deletedAt: null },
      });
      expect(count).toBe(1);
    });

    it('treats the key as case-insensitive and ignores JSON key order', async () => {
      const key = randomUUID();
      const payload = summary({ date: daysAgo(31), unit: 'idem-2' });
      const reordered = Object.fromEntries(Object.entries(payload).reverse());

      const first = await send(keyToken, key.toLowerCase(), payload).expect(201);
      const second = await send(keyToken, key.toUpperCase(), reordered).expect(201);

      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body.id).toBe(first.body.id);
    });

    it('rejects the same key with a different payload (422)', async () => {
      const key = randomUUID();
      await send(keyToken, key, summary({ date: daysAgo(32), unit: 'idem-3' })).expect(201);

      const res = await send(
        keyToken,
        key,
        summary({ date: daysAgo(32), unit: 'idem-3', income: 999 }),
      ).expect(422);
      expect(JSON.stringify(res.body)).toContain('different request payload');
    });

    it('rejects a key that is not a UUID (400)', async () => {
      await send(keyToken, 'not-a-uuid', summary({ date: daysAgo(33) })).expect(400);
    });

    it('does not remember failed requests, so the client can fix and retry', async () => {
      const key = randomUUID();

      // Invalid (wrong currency) -> 400, and the key must NOT be stored.
      await send(
        keyToken,
        key,
        summary({ date: daysAgo(34), unit: 'idem-4', currency: 'USD' }),
      ).expect(400);

      // Same key with a corrected payload succeeds (would be 422 if the failure was stored).
      await send(keyToken, key, summary({ date: daysAgo(34), unit: 'idem-4' })).expect(201);
    });

    it('scopes keys per token: the same key on another token is a fresh request', async () => {
      const key = randomUUID();
      const payload = summary({ date: daysAgo(35), unit: 'idem-5' });

      const a = await send(keyToken, key, payload).expect(201);
      const b = await send(otherKeyToken, key, payload).expect(201);

      expect(b.headers['idempotent-replayed']).toBeUndefined();
      expect(b.body.id).not.toBe(a.body.id);
      expect(b.body.containerId).toBe(otherBusinessId);
    });

    it('works on the bulk endpoint too', async () => {
      const key = randomUUID();
      const body = { summaries: [summary({ date: daysAgo(36), unit: 'idem-6' })] };
      const post = () =>
        http()
          .post('/v1/summary/bulk')
          .set(bearer(keyToken))
          .set('Idempotency-Key', key)
          .send(body);

      const first = await post().expect(201);
      const second = await post().expect(201);

      expect(second.headers['idempotent-replayed']).toBe('true');
      expect(second.body).toEqual(first.body);
    });

    it('still works without the header (plain POST)', async () => {
      await send(keyToken, undefined, summary({ date: daysAgo(37), unit: 'idem-7' })).expect(201);
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

    it('limits per token, not per IP: another token is unaffected by an exhausted one', async () => {
      // `otherApiToken` is throttled by the previous test. A different token from the very
      // same IP (supertest) must still be served.
      await http().get('/v1/business').set(bearer(otherApiToken)).expect(429);

      const fresh = await http()
        .post(`/businesses/${businessId}/tokens`)
        .set(bearer(ownerJwt))
        .send({ label: 'Unthrottled token' })
        .expect(201);

      await http().get('/v1/business').set(bearer(fresh.body.token)).expect(200);
    });
  });
});
