import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SummariesService } from '../summaries/summaries.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { ExternalApiService } from './external-api.service';

describe('ExternalApi (Integration)', () => {
  let service: ExternalApiService;
  let prisma: PrismaService;
  let userId: string;
  let businessId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [ExternalApiService, SummariesService, SnapshotsService, PrismaService],
    }).compile();

    service = module.get(ExternalApiService);
    prisma = module.get(PrismaService);

    userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `ext-api-${Date.now()}@test.com`,
        passwordHash: 'x',
        name: 'Test',
      },
    });

    const business = await prisma.container.create({
      data: {
        id: randomUUID(),
        userId,
        type: 'EXTERNAL_BUSINESS',
        name: 'Ext Biz',
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

  it('is idempotent when the exact same summary is pushed twice', async () => {
    const payload = {
      date: '2026-11-20',
      currency: 'KES',
      cashBalance: 1000,
      assetsValue: 5000,
      liabilitiesValue: 1000,
      unit: 'Test Farm',
    };

    // First push
    const first = await service.createSummary(userId, businessId, payload);
    expect(first.netWorth).toBe(4000);

    // Second push (should not throw ConflictException, should return the same record)
    const second = await service.createSummary(userId, businessId, payload);
    expect(second.id).toBe(first.id);
    expect((second as any).idempotent).toBe(true);
  });
});
