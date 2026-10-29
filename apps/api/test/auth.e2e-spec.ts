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
      where: { email: { startsWith: 'e2e-' } },
    });
    await app.close();
  });

  it('should sign up a new user via HTTP (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email: testEmail, password: 'password123', name: 'E2E User' })
      .expect(201);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');

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

  it('should logout and invalidate only that session (200 then 401)', async () => {
    // 1. Clean up all sessions to ensure we only test the one we create
    const userRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    const userId = userRes.body.user.id;
    await prisma.session.deleteMany({ where: { userId } });

    // 2. Login fresh to create exactly 1 session
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(200);

    const refreshToken = loginRes.body.refreshToken;

    // 3. Logout using that specific refresh token
    await request(app.getHttpServer()).post('/api/auth/logout').send({ refreshToken }).expect(200);

    // 4. Wait a moment to ensure DB transaction is committed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 5. Try to use the refresh token after logout (should fail with 401)
    await request(app.getHttpServer()).post('/api/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('should complete the password reset flow (200)', async () => {
    // 1. Request a password reset
    const forgotRes = await request(app.getHttpServer())
      .post('/api/auth/forgot-password')
      .send({ email: testEmail })
      .expect(200);

    // 2. Grab the devToken (only returned in dev/test)
    const devToken = forgotRes.body.devToken;
    expect(devToken).toBeDefined();

    // 3. Reset the password
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: devToken, newPassword: 'newpassword456' })
      .expect(200);

    // 4. Login with the new password
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'newpassword456' })
      .expect(200);

    // 5. Try to login with the OLD password (should fail with 401)
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'password123' })
      .expect(401);
  });
});
