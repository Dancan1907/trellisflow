import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SummaryPeriod } from '@prisma/client';
import { SummariesService } from './summaries.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SnapshotsService } from '../snapshots/snapshots.service';

const createdAt = new Date('2026-11-18T00:00:00.000Z');

const externalContainer = {
  id: 'biz-1',
  userId: 'user-1',
  type: 'EXTERNAL_BUSINESS',
  name: 'Sugarcane Farm',
  currency: 'KES',
  status: 'ACTIVE',
  archivedAt: null,
  deletedAt: null,
  createdAt,
  updatedAt: createdAt,
};

const source = {
  id: 'src-1',
  containerId: 'biz-1',
  sourceType: 'MANUAL',
  lastSyncedAt: null,
  lastSummaryDate: null,
  lastSummaryAt: null,
  syncInterval: 'MANUAL',
  createdAt,
  updatedAt: createdAt,
};

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sum-1',
    userId: 'user-1',
    containerId: 'biz-1',
    unit: null,
    date: new Date('2026-11-18T00:00:00.000Z'),
    period: 'DAY',
    periodStart: null,
    periodEnd: null,
    income: '5000',
    expenses: '3200',
    transfersIn: '0',
    transfersOut: '1000',
    cashBalance: '12500',
    assetsValue: '48000',
    liabilitiesValue: '6000',
    currency: 'KES',
    notes: null,
    source: 'MANUAL',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

const today = new Date().toISOString().slice(0, 10);

const mockPrisma = {
  container: { findFirst: jest.fn(), findMany: jest.fn() },
  summary: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  summaryVersion: {
    aggregate: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  externalBusinessSource: { upsert: jest.fn() },
  insight: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockSnapshots = { computeAndSaveForUser: jest.fn() };

describe('SummariesService (Unit)', () => {
  let service: SummariesService;

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') return (arg as (tx: unknown) => unknown)(mockPrisma);
      return Promise.all(arg as Promise<unknown>[]);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummariesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SnapshotsService, useValue: mockSnapshots },
      ],
    }).compile();

    service = module.get<SummariesService>(SummariesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==========================================================================
  // create
  // ==========================================================================

  describe('create', () => {
    const dto = {
      date: today,
      currency: 'KES',
      cashBalance: 12500,
      assetsValue: 48000,
      liabilitiesValue: 6000,
      income: 5000,
      expenses: 3200,
      transfersOut: 1000,
      unit: '  Farm #47  ',
    };

    it('stores a manual summary and refreshes the net-worth snapshot', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);
      mockPrisma.summary.findFirst.mockResolvedValue(null);
      mockPrisma.summary.create.mockResolvedValue(summary({ unit: 'Farm #47' }));

      const result = await service.create('user-1', 'biz-1', dto);

      expect(mockPrisma.summary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            containerId: 'biz-1',
            unit: 'Farm #47',
            currency: 'KES',
            source: 'MANUAL',
          }),
        }),
      );
      expect(mockPrisma.externalBusinessSource.upsert).toHaveBeenCalled();
      expect(mockPrisma.insight.updateMany).toHaveBeenCalled();
      expect(mockSnapshots.computeAndSaveForUser).toHaveBeenCalledWith('user-1');
      expect(result.netWorth).toBe(42000);
      expect(result.unit).toBe('Farm #47');
    });

    it('rejects a duplicate (date, unit) pair', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);
      mockPrisma.summary.findFirst.mockResolvedValue(summary());

      await expect(service.create('user-1', 'biz-1', dto)).rejects.toThrow(ConflictException);
    });

    it('rejects a currency that does not match the business', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);

      await expect(service.create('user-1', 'biz-1', { ...dto, currency: 'USD' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a summary dated in the future', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);

      await expect(
        service.create('user-1', 'biz-1', { ...dto, date: '2999-01-01' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a start and end for custom periods', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);

      await expect(
        service.create('user-1', 'biz-1', { ...dto, period: SummaryPeriod.CUSTOM }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a business that is not external or not owned', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', 'biz-1', dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // read
  // ==========================================================================

  describe('findAll', () => {
    it('returns history with version counts and a total', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);
      mockPrisma.summary.findMany.mockResolvedValue([{ ...summary(), _count: { versions: 2 } }]);
      mockPrisma.summary.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', 'biz-1');

      expect(result.total).toBe(1);
      expect(result.items[0]?.versionCount).toBe(2);
      expect(result.items[0]?.netWorth).toBe(42000);
    });
  });

  describe('findLatest', () => {
    it('throws when the business has no summaries', async () => {
      mockPrisma.container.findFirst.mockResolvedValue(externalContainer);
      mockPrisma.summary.findFirst.mockResolvedValue(null);

      await expect(service.findLatest('user-1', 'biz-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================================================
  // correction
  // ==========================================================================

  describe('correct', () => {
    it('snapshots the previous values and increments the version', async () => {
      mockPrisma.summary.findFirst.mockResolvedValue({
        ...summary(),
        container: externalContainer,
      });
      mockPrisma.summaryVersion.aggregate.mockResolvedValue({ _max: { versionNumber: null } });
      mockPrisma.summary.update.mockResolvedValue(summary({ income: '6000' }));

      const result = await service.correct('user-1', 'sum-1', {
        income: 6000,
        reason: 'Miscounted the harvest',
      });

      expect(mockPrisma.summaryVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 1,
            reason: 'Miscounted the harvest',
            snapshot: expect.objectContaining({ income: 5000 }),
          }),
        }),
      );
      expect(result.versionNumber).toBe(1);
      expect(result.income).toBe(6000);
      expect(mockSnapshots.computeAndSaveForUser).toHaveBeenCalledWith('user-1');
    });

    it('turns a unique violation into a conflict', async () => {
      mockPrisma.summary.findFirst.mockResolvedValue({
        ...summary(),
        container: externalContainer,
      });
      mockPrisma.summaryVersion.aggregate.mockResolvedValue({ _max: { versionNumber: 0 } });
      mockPrisma.summary.update.mockRejectedValue({ code: 'P2002' });

      await expect(service.correct('user-1', 'sum-1', { date: '2026-11-17' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects summaries that do not belong to an external business', async () => {
      mockPrisma.summary.findFirst.mockResolvedValue({
        ...summary(),
        container: { ...externalContainer, type: 'INTERNAL_BUSINESS' },
      });

      await expect(service.correct('user-1', 'sum-1', { income: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findVersions', () => {
    it('maps the correction history', async () => {
      mockPrisma.summary.findFirst.mockResolvedValue({
        ...summary(),
        container: externalContainer,
      });
      mockPrisma.summaryVersion.findMany.mockResolvedValue([
        {
          id: 'ver-1',
          versionNumber: 1,
          snapshot: { income: 5000 },
          editedAt: createdAt,
          reason: 'Fix',
          editor: { id: 'user-1', name: 'Owner', email: 'owner@test.dev' },
        },
      ]);

      const result = await service.findVersions('user-1', 'sum-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.versionNumber).toBe(1);
      expect(result[0]?.editor.name).toBe('Owner');
    });
  });

  // ==========================================================================
  // stale detection
  // ==========================================================================

  describe('processStale', () => {
    const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);

    it('creates an insight for a business with no summaries', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          ...externalContainer,
          createdAt: daysAgo(60),
          externalSource: source,
          summaries: [],
        },
      ]);
      mockPrisma.insight.findFirst.mockResolvedValue(null);

      const result = await service.processStale('user-1');

      expect(result).toEqual({ checked: 1, stale: 1, created: 1 });
      expect(mockPrisma.insight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'STALE_SUMMARY',
            relatedEntityId: 'biz-1',
          }),
        }),
      );
    });

    it('does not flag a business with a recent summary', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          ...externalContainer,
          createdAt: daysAgo(60),
          externalSource: source,
          summaries: [{ ...summary(), createdAt: new Date() }],
        },
      ]);

      const result = await service.processStale('user-1');

      expect(result).toEqual({ checked: 1, stale: 0, created: 0 });
      expect(mockPrisma.insight.create).not.toHaveBeenCalled();
    });

    it('does not duplicate an existing active stale insight', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          ...externalContainer,
          createdAt: daysAgo(60),
          externalSource: source,
          summaries: [],
        },
      ]);
      mockPrisma.insight.findFirst.mockResolvedValue({ id: 'insight-1' });

      const result = await service.processStale('user-1');

      expect(result).toEqual({ checked: 1, stale: 1, created: 0 });
    });

    it('honours an explicit threshold', async () => {
      mockPrisma.container.findMany.mockResolvedValue([
        {
          ...externalContainer,
          createdAt: daysAgo(60),
          externalSource: source,
          summaries: [{ ...summary(), createdAt: daysAgo(2) }],
        },
      ]);
      mockPrisma.insight.findFirst.mockResolvedValue(null);

      const result = await service.processStale('user-1', 1);

      expect(result.created).toBe(1);
    });
  });
});
