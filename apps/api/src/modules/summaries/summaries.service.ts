import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Container, Prisma, Summary, SummaryPeriod } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';
import { QuerySummariesDto } from './dto/query-summaries.dto';
import { serializeSummary } from './summary.util';

type SummaryWithContainer = Summary & { container: Container };
type SummaryWithVersionCount = Summary & { _count: { versions: number } };

@Injectable()
export class SummariesService {
  constructor(
    private prisma: PrismaService,
    private snapshots: SnapshotsService,
  ) {}

  // ==========================================================================
  // Create
  // ==========================================================================

  async create(userId: string, businessId: string, dto: CreateSummaryDto) {
    const container = await this.getExternalBusiness(userId, businessId);

    const date = this.parseDate(dto.date);
    this.assertNotInFuture(date);

    const currency = dto.currency.toUpperCase();
    if (currency !== container.currency) {
      throw new BadRequestException(
        `Currency must match the business currency (${container.currency})`,
      );
    }

    const period = dto.period ?? SummaryPeriod.DAY;
    const { periodStart, periodEnd } = this.resolvePeriod(period, dto.periodStart, dto.periodEnd);

    const unit = dto.unit?.trim() || null;
    await this.assertNoDuplicate(container.id, date, unit);

    try {
      const summary = await this.prisma.$transaction(async (tx) => {
        const created = await tx.summary.create({
          data: {
            id: randomUUID(),
            userId,
            containerId: container.id,
            date,
            period,
            periodStart,
            periodEnd,
            unit,
            income: dto.income ?? 0,
            expenses: dto.expenses ?? 0,
            transfersIn: dto.transfersIn ?? 0,
            transfersOut: dto.transfersOut ?? 0,
            cashBalance: dto.cashBalance,
            assetsValue: dto.assetsValue,
            liabilitiesValue: dto.liabilitiesValue,
            currency,
            notes: dto.notes ?? null,
            source: 'MANUAL',
          },
        });

        await this.touchSource(tx, container.id, date);
        await this.expireStaleInsights(tx, userId, container.id);

        return created;
      });

      // External net worth is part of the user's roll-up: refresh the snapshot.
      await this.snapshots.computeAndSaveForUser(userId);

      return serializeSummary(summary);
    } catch (error) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  // ==========================================================================
  // Read
  // ==========================================================================

  async findAll(userId: string, businessId: string, query: QuerySummariesDto = {}) {
    const container = await this.getExternalBusiness(userId, businessId);
    const limit = query.limit ?? 50;

    const where = { userId, containerId: container.id, deletedAt: null };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.summary.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        include: { _count: { select: { versions: true } } },
      }),
      this.prisma.summary.count({ where }),
    ]);

    return {
      items: items.map((summary) => this.withVersionCount(summary)),
      total,
    };
  }

  async findLatest(userId: string, businessId: string) {
    const container = await this.getExternalBusiness(userId, businessId);

    const summary = await this.prisma.summary.findFirst({
      where: { userId, containerId: container.id, deletedAt: null },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { _count: { select: { versions: true } } },
    });

    if (!summary) {
      throw new NotFoundException('No summaries recorded for this business yet');
    }

    return this.withVersionCount(summary);
  }

  async findVersions(userId: string, summaryId: string) {
    const summary = await this.getSummaryWithContainer(userId, summaryId);

    const versions = await this.prisma.summaryVersion.findMany({
      where: { summaryId: summary.id },
      orderBy: { versionNumber: 'desc' },
      include: {
        editor: { select: { id: true, name: true, email: true } },
      },
    });

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      snapshot: version.snapshot,
      editedAt: version.editedAt,
      reason: version.reason,
      editor: version.editor,
    }));
  }

  // ==========================================================================
  // Correction (append-only via versioning)
  // ==========================================================================

  async correct(userId: string, summaryId: string, dto: UpdateSummaryDto) {
    const summary = await this.getSummaryWithContainer(userId, summaryId);
    const container = summary.container;

    const data: Prisma.SummaryUpdateInput = {};

    if (dto.date !== undefined) {
      const date = this.parseDate(dto.date);
      this.assertNotInFuture(date);
      data.date = date;
    }

    if (dto.currency !== undefined) {
      const currency = dto.currency.toUpperCase();
      if (currency !== container.currency) {
        throw new BadRequestException(
          `Currency must match the business currency (${container.currency})`,
        );
      }
      data.currency = currency;
    }

    if (dto.period !== undefined || dto.periodStart !== undefined || dto.periodEnd !== undefined) {
      const period = dto.period ?? summary.period;
      const start =
        dto.periodStart !== undefined ? this.parseDate(dto.periodStart) : summary.periodStart;
      const end = dto.periodEnd !== undefined ? this.parseDate(dto.periodEnd) : summary.periodEnd;

      if (period === SummaryPeriod.CUSTOM) {
        if (!start || !end) {
          throw new BadRequestException('Custom periods require periodStart and periodEnd');
        }
        if (start > end) {
          throw new BadRequestException('periodStart must be on or before periodEnd');
        }
        data.periodStart = start;
        data.periodEnd = end;
      } else {
        data.periodStart = null;
        data.periodEnd = null;
      }
      data.period = period;
    }

    if (dto.unit !== undefined) data.unit = dto.unit.trim() || null;
    if (dto.income !== undefined) data.income = dto.income;
    if (dto.expenses !== undefined) data.expenses = dto.expenses;
    if (dto.transfersIn !== undefined) data.transfersIn = dto.transfersIn;
    if (dto.transfersOut !== undefined) data.transfersOut = dto.transfersOut;
    if (dto.cashBalance !== undefined) data.cashBalance = dto.cashBalance;
    if (dto.assetsValue !== undefined) data.assetsValue = dto.assetsValue;
    if (dto.liabilitiesValue !== undefined) data.liabilitiesValue = dto.liabilitiesValue;
    if (dto.notes !== undefined) data.notes = dto.notes;

    // Snapshot the values *before* the correction, as plain JSON.
    const before = JSON.parse(JSON.stringify(serializeSummary(summary))) as Prisma.InputJsonValue;

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const aggregate = await tx.summaryVersion.aggregate({
            where: { summaryId: summary.id },
            _max: { versionNumber: true },
          });
          const versionNumber = (aggregate._max.versionNumber ?? 0) + 1;

          const updated = await tx.summary.update({
            where: { id: summary.id },
            data,
          });

          await tx.summaryVersion.create({
            data: {
              id: randomUUID(),
              summaryId: summary.id,
              versionNumber,
              snapshot: before,
              editedBy: userId,
              reason: dto.reason ?? null,
            },
          });

          await this.touchSource(tx, container.id, updated.date);
          await this.expireStaleInsights(tx, userId, container.id);

          return { updated, versionNumber };
        },
        { timeout: 15000 },
      );

      await this.snapshots.computeAndSaveForUser(userId);

      return {
        ...serializeSummary(result.updated),
        versionNumber: result.versionNumber,
      };
    } catch (error) {
      this.rethrowUniqueViolation(error);
      throw error;
    }
  }

  // ==========================================================================
  // Stale-summary detection
  // ==========================================================================

  /**
   * Creates a `STALE_SUMMARY` insight for every active external business whose
   * newest summary is older than its expected cadence (or older than `days`).
   * Existing active stale insights are not duplicated.
   */
  async processStale(userId: string, days?: number) {
    const containers = await this.prisma.container.findMany({
      where: { userId, type: 'EXTERNAL_BUSINESS', status: 'ACTIVE' },
      include: {
        externalSource: true,
        summaries: {
          where: { deletedAt: null },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
    });

    const now = new Date();
    let stale = 0;
    let created = 0;

    for (const container of containers) {
      const thresholdDays = days ?? this.staleThresholdDays(container.externalSource?.syncInterval);
      const latest = container.summaries[0] ?? null;
      const reference = latest ? latest.createdAt : container.createdAt;
      const ageDays = (now.getTime() - reference.getTime()) / 86_400_000;

      if (ageDays <= thresholdDays) continue;

      stale += 1;

      const existing = await this.prisma.insight.findFirst({
        where: {
          userId,
          type: 'STALE_SUMMARY',
          relatedEntityId: container.id,
          status: 'ACTIVE',
        },
      });

      if (existing) continue;

      await this.prisma.insight.create({
        data: {
          id: randomUUID(),
          userId,
          type: 'STALE_SUMMARY',
          severity: 'WARNING',
          title: 'Business summary is stale',
          message: latest
            ? `No summary for ${container.name} in ${Math.floor(ageDays)} days.`
            : `No summaries recorded for ${container.name} yet.`,
          relatedContainerId: container.id,
          relatedEntityType: 'container',
          relatedEntityId: container.id,
          actionUrl: `/businesses/${container.id}`,
          metadata: {
            ageDays: Math.floor(ageDays),
            thresholdDays,
          },
        },
      });

      created += 1;
    }

    return { checked: containers.length, stale, created };
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  private async getExternalBusiness(userId: string, businessId: string) {
    const container = await this.prisma.container.findFirst({
      where: {
        id: businessId,
        userId,
        type: 'EXTERNAL_BUSINESS',
        status: 'ACTIVE',
      },
    });

    if (!container) {
      throw new NotFoundException('External business not found');
    }

    return container;
  }

  private async getSummaryWithContainer(
    userId: string,
    summaryId: string,
  ): Promise<SummaryWithContainer> {
    const summary = await this.prisma.summary.findFirst({
      where: { id: summaryId, userId, deletedAt: null },
      include: { container: true },
    });

    if (!summary) {
      throw new NotFoundException('Summary not found');
    }

    if (summary.container.type !== 'EXTERNAL_BUSINESS') {
      throw new BadRequestException('Summaries only belong to external businesses');
    }

    return summary;
  }

  private async assertNoDuplicate(containerId: string, date: Date, unit: string | null) {
    const existing = await this.prisma.summary.findFirst({
      where: { containerId, date, unit, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('A summary already exists for that date and unit');
    }
  }

  private resolvePeriod(
    period: SummaryPeriod,
    startValue?: string,
    endValue?: string,
  ): { periodStart: Date | null; periodEnd: Date | null } {
    if (period !== SummaryPeriod.CUSTOM) {
      return { periodStart: null, periodEnd: null };
    }

    if (!startValue || !endValue) {
      throw new BadRequestException('Custom periods require periodStart and periodEnd');
    }

    const periodStart = this.parseDate(startValue);
    const periodEnd = this.parseDate(endValue);

    if (periodStart > periodEnd) {
      throw new BadRequestException('periodStart must be on or before periodEnd');
    }

    return { periodStart, periodEnd };
  }

  private assertNotInFuture(date: Date) {
    if (date > this.startOfUtcDay(new Date())) {
      throw new BadRequestException('Summary date cannot be in the future');
    }
  }

  private staleThresholdDays(interval: string | null | undefined): number {
    switch (interval) {
      case 'DAILY':
        return 2;
      case 'WEEKLY':
        return 8;
      default:
        return 30;
    }
  }

  /** Parses a `YYYY-MM-DD` (or ISO) string as UTC midnight. */
  private parseDate(value: string): Date {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
    );
  }

  private async touchSource(tx: Prisma.TransactionClient, containerId: string, summaryDate: Date) {
    const now = new Date();

    await tx.externalBusinessSource.upsert({
      where: { containerId },
      create: {
        id: randomUUID(),
        containerId,
        sourceType: 'MANUAL',
        syncInterval: 'MANUAL',
        lastSummaryDate: summaryDate,
        lastSummaryAt: now,
        lastSyncedAt: now,
      },
      update: {
        lastSummaryDate: summaryDate,
        lastSummaryAt: now,
        lastSyncedAt: now,
      },
    });
  }

  private async expireStaleInsights(
    tx: Prisma.TransactionClient,
    userId: string,
    containerId: string,
  ) {
    await tx.insight.updateMany({
      where: {
        userId,
        type: 'STALE_SUMMARY',
        relatedEntityId: containerId,
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRED', expiresAt: new Date() },
    });
  }

  private rethrowUniqueViolation(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException('A summary already exists for that date and unit');
    }
  }

  private withVersionCount(summary: SummaryWithVersionCount) {
    return {
      ...serializeSummary(summary),
      versionCount: summary._count.versions,
    };
  }
}
