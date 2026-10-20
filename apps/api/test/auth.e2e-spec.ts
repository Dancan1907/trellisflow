import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  const testEmail = `e2e-${Date.now()}@trellisflow.com`;

  beforeAll(async () => {
    // 1. Boot up the entire NestJS app
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // 2. Apply the same global configuration as main.ts
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api', {
      exclude: [{ path: 'health', method: 0 }], // 0 = RequestMethod.GET
    });

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { startsWith: 'e2e-' } },
    });
    await app.close();
  });

  it('should sign up a new user via HTTP (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: 'password123', name: 'E2E User' })
      .expect(201);

    // Verify the response body
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

    // Save the token for the next test
    accessToken = res.body.accessToken;
  });

  it('should reject access to /me without a token (401)', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('should allow access to /me with a valid token (200)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(testEmail);
  });

  it('should log in with the created user (200)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('should logout and invalidate the session (200 then 401)', async () => {
    // 1. Login to get a fresh refresh token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken;

    // 2. Logout using that refresh token
    await request(app.getHttpServer()).post('/api/auth/logout').send({ refreshToken }).expect(200);

    // 3. Try to use the refresh token after logout (should fail with 401)
    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401);
  });
});
