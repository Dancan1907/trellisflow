import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { SummaryPeriod } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { SummariesService } from './summaries.service';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { SnapshotsService } from '../snapshots/snapshots.service';

const today = new Date().toISOString().slice(0, 10);

describe('Summaries (Integration)', () => {
  let summaries: SummariesService;
  let businesses: BusinessesService;
  let prisma: PrismaService;
  let userId: string;
  let businessId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true })],
      providers: [SummariesService, BusinessesService, SnapshotsService, PrismaService],
    }).compile();

    summaries = module.get<SummariesService>(SummariesService);
    businesses = module.get<BusinessesService>(BusinessesService);
    prisma = module.get<PrismaService>(PrismaService);

    userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `summaries-int-${Date.now()}@trellisflow.test`,
        passwordHash: 'x',
        name: 'Summaries Integration Test',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    const business = await businesses.create(userId, {
      name: 'Sugarcane Farm',
      type: 'EXTERNAL_BUSINESS',
      businessType: 'FARMING',
      currency: 'KES',
    });
    businessId = business.id;
  });

  afterEach(async () => {
    await prisma.container.deleteMany({ where: { id: businessId } });
  });

  function summaryInput(overrides: Partial<CreateSummaryDto> = {}): CreateSummaryDto {
    return {
      date: today,
      currency: 'KES',
      cashBalance: 12500,
      assetsValue: 48000,
      liabilitiesValue: 6000,
      income: 5000,
      expenses: 3200,
      transfersOut: 1000,
      unit: 'Farm #47',
      ...overrides,
    };
  }

  it('persists a summary and updates the external source', async () => {
    const created = await summaries.create(userId, businessId, summaryInput());

    expect(created.netWorth).toBe(42000);
    expect(created.unit).toBe('Farm #47');

    const row = await prisma.summary.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
    expect(Number(row?.income)).toBe(5000);
    expect(row?.source).toBe('MANUAL');

    const container = await prisma.container.findUnique({
      where: { id: businessId },
      include: { externalSource: true },
    });
    expect(container?.externalSource?.lastSummaryAt).not.toBeNull();
    expect(container?.externalSource?.lastSummaryDate).not.toBeNull();
  });

  it('rejects a duplicate (date, unit) but allows a different unit', async () => {
    await summaries.create(userId, businessId, summaryInput());

    await expect(summaries.create(userId, businessId, summaryInput())).rejects.toThrow(
      ConflictException,
    );

    const secondUnit = await summaries.create(
      userId,
      businessId,
      summaryInput({ unit: 'Farm #48', assetsValue: 30000 }),
    );
    expect(secondUnit.unit).toBe('Farm #48');

    const history = await summaries.findAll(userId, businessId);
    expect(history.total).toBe(2);
  });

  it('returns history newest first', async () => {
    await summaries.create(userId, businessId, summaryInput({ date: '2026-11-01' }));
    await summaries.create(
      userId,
      businessId,
      summaryInput({ date: '2026-11-15', unit: 'Farm #48' }),
    );

    const history = await summaries.findAll(userId, businessId);

    expect(history.total).toBe(2);
    expect(history.items[0]?.date).toBe('2026-11-15');
    expect(history.items[1]?.date).toBe('2026-11-01');
  });

  it('corrects a summary and preserves the old values as a version', async () => {
    const created = await summaries.create(userId, businessId, summaryInput());

    const corrected = await summaries.correct(userId, created.id, {
      income: 6000,
      reason: 'Miscounted the harvest',
    });

    expect(corrected.income).toBe(6000);
    expect(corrected.versionNumber).toBe(1);

    const versions = await summaries.findVersions(userId, created.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]?.versionNumber).toBe(1);
    expect(versions[0]?.reason).toBe('Miscounted the harvest');
    expect((versions[0]?.snapshot as { income: number }).income).toBe(5000);

    const row = await prisma.summary.findUnique({ where: { id: created.id } });
    expect(Number(row?.income)).toBe(6000);
  });

  it('supports custom period ranges', async () => {
    const created = await summaries.create(
      userId,
      businessId,
      summaryInput({
        period: SummaryPeriod.CUSTOM,
        periodStart: '2026-11-01',
        periodEnd: '2026-11-15',
      }),
    );

    expect(created.period).toBe('CUSTOM');
    expect(created.periodStart).toBe('2026-11-01');
    expect(created.periodEnd).toBe('2026-11-15');
  });

  it('rejects a future summary date', async () => {
    await expect(
      summaries.create(userId, businessId, summaryInput({ date: '2999-01-01' })),
    ).rejects.toThrow();
  });

  it('does not expose summaries to another user', async () => {
    const created = await summaries.create(userId, businessId, summaryInput({ unit: undefined }));

    await expect(summaries.correct(randomUUID(), created.id, { income: 1 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects summaries for internal businesses', async () => {
    const internal = await businesses.create(userId, {
      name: 'Internal Shop',
      businessType: 'RETAIL',
      currency: 'KES',
    });

    try {
      await expect(
        summaries.create(userId, internal.id, summaryInput({ unit: undefined })),
      ).rejects.toThrow(NotFoundException);
    } finally {
      await prisma.container.delete({ where: { id: internal.id } });
    }
  });

  it('rolls external net worth into the daily snapshot', async () => {
    await summaries.create(
      userId,
      businessId,
      summaryInput({ assetsValue: 50000, liabilitiesValue: 5000 }),
    );

    const first = await prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    expect(Number(first?.businessesNetWorth)).toBe(45000);
    expect(Number(first?.totalNetWorth)).toBe(45000);

    await summaries.create(
      userId,
      businessId,
      summaryInput({ unit: 'Farm #48', assetsValue: 60000, liabilitiesValue: 5000 }),
    );

    const second = await prisma.netWorthSnapshot.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });
    expect(Number(second?.businessesNetWorth)).toBe(55000);
  });

  it('flags a stale business and clears the insight when a summary arrives', async () => {
    await prisma.container.update({
      where: { id: businessId },
      data: { createdAt: new Date(Date.now() - 60 * 86_400_000) },
    });

    const firstRun = await summaries.processStale(userId);
    expect(firstRun.stale).toBe(1);
    expect(firstRun.created).toBe(1);

    const insight = await prisma.insight.findFirst({
      where: {
        userId,
        type: 'STALE_SUMMARY',
        relatedEntityId: businessId,
        status: 'ACTIVE',
      },
    });
    expect(insight).not.toBeNull();

    await summaries.create(userId, businessId, summaryInput());

    const expired = await prisma.insight.findFirst({
      where: { userId, type: 'STALE_SUMMARY', relatedEntityId: businessId },
    });
    expect(expired?.status).toBe('EXPIRED');

    const secondRun = await summaries.processStale(userId);
    expect(secondRun.created).toBe(0);
  });
});
