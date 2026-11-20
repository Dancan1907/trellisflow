import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiTokensService } from './api-tokens.service';

describe('ApiTokens (Integration)', () => {
  let service: ApiTokensService;
  let prisma: PrismaService;
  let userId: string;
  let businessId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [ApiTokensService, PrismaService],
    }).compile();

    service = module.get(ApiTokensService);
    prisma = module.get(PrismaService);

    userId = randomUUID();
    await prisma.user.create({
      data: { id: userId, email: `tokens-${Date.now()}@test.com`, passwordHash: 'x', name: 'Test' },
    });

    const business = await prisma.container.create({
      data: {
        id: randomUUID(),
        userId,
        type: 'EXTERNAL_BUSINESS',
        name: 'Test Biz',
        currency: 'KES',
        status: 'ACTIVE',
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('creates a token, validates it, and revokes it', async () => {
    // 1. Create
    const created = await service.create(userId, businessId, { label: 'Integration Token' });
    expect(created.token).toBeDefined();

    // 2. Validate
    const validated = await service.validateToken(created.token);
    expect(validated.container.id).toBe(businessId);
    expect(validated.lastUsedAt).not.toBeNull();

    // 3. Revoke
    await service.revoke(userId, created.id);

    // 4. Validation should now fail
    await expect(service.validateToken(created.token)).rejects.toThrow();
  });
});
