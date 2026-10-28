import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('Users (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  const email = `users-test-${randomUUID()}@trellisflow.local`;
  const password = 'TestPassword123!';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);

    // Create a throwaway user
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        passwordHash: await argon2.hash(password),
        name: 'Users Test',
      },
    });
    userId = user.id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    await app.close();
  });

  it('GET /api/users/me returns the current user profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(email);
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('PATCH /api/users/me updates the profile', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Updated Name', reportingCurrency: 'KES' })
      .expect(200);

    expect(res.body.name).toBe('Updated Name');
    expect(res.body.reportingCurrency).toBe('KES');

    // Confirm it persisted
    const persisted = await prisma.user.findUnique({ where: { id: userId } });
    expect(persisted?.name).toBe('Updated Name');
  });

  it('PATCH /api/users/me rejects invalid currency', async () => {
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reportingCurrency: 'XYZ' })
      .expect(400);
  });

  it('GET /api/users/me rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);
  });
});
