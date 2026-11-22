import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Data Export (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const email = `export-test-${Date.now()}@trellisflow.test`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
    await app.init();
    prisma = app.get(PrismaService);

    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({ email, password, name: 'Export User' })
      .expect(201);

    accessToken = signup.body.accessToken;
    userId = signup.body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: 'export-test-' } } });
    await app.close();
  });

  it('exports JSON successfully', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export/json')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment');

    // Parse the response body to ensure valid JSON structure
    const parsed = JSON.parse(res.text);
    expect(parsed).toHaveProperty('exportedAt');
    expect(parsed).toHaveProperty('user');
    expect(parsed.user.id).toBe(userId);
  });

  it('exports CSV successfully', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Date,Type,Amount,Currency,Account,Category,Description');
  });

  it('exports PDF successfully', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/export/pdf')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    // PDFs start with %PDF
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
