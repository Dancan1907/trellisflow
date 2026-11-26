import { NotFoundException } from '@nestjs/common';
import { InsightNarrationService } from './insight-narration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_PROVIDER } from '../ai/ai-provider.interface';
import { AiUsageService } from '../ai/ai-usage.service';
import { ConfigService } from '@nestjs/config';

describe('InsightNarrationService', () => {
  let service: InsightNarrationService;
  let prisma: any;
  let config: any;
  let usage: any;
  let provider: any;

  beforeEach(() => {
    prisma = {
      insight: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    config = { get: jest.fn((key: string, fallback?: string) =>
      key === 'AI_INSIGHTS_NARRATION_ENABLED' ? 'true' : fallback,
    ) };
    usage = {
      reserveInsightNarration: jest.fn().mockResolvedValue(new Date('2026-11-26T00:00:00Z')),
      recordInsightNarration: jest.fn().mockResolvedValue(undefined),
    };
    provider = {
      generateWithUsage: jest.fn().mockResolvedValue({
        text: 'Your spending is above the usual level. Review this category and consider adjusting your budget.',
        inputTokens: 30,
        outputTokens: 18,
        model: 'test-model',
      }),
    };
    service = new InsightNarrationService(
      prisma as PrismaService,
      config as ConfigService,
      usage as AiUsageService,
      provider,
    );
  });

  it('recovers only processing jobs whose processing timestamp is stale', async () => {
    await service.processQueue();

    const recovery = prisma.insight.updateMany.mock.calls[0][0];
    expect(recovery).toEqual(expect.objectContaining({
      where: expect.objectContaining({
        status: 'ACTIVE',
        narrationStatus: 'PROCESSING',
        OR: [
          { narrationProcessingAt: { lt: expect.any(Date) } },
          { narrationProcessingAt: null },
        ],
      }),
      data: { narrationStatus: 'QUEUED', narrationProcessingAt: null },
    }));
    expect(recovery.where).not.toHaveProperty('createdAt');
  });

  it('does not reserve quota when an insight is no longer active before narration starts', async () => {
    prisma.insight.findMany.mockResolvedValue([{
      id: 'i-dismissed', userId: 'u-1', narrationStatus: 'QUEUED', createdAt: new Date(),
    }]);
    prisma.insight.findFirst.mockResolvedValue(null);

    await service.processQueue();

    expect(usage.reserveInsightNarration).not.toHaveBeenCalled();
    expect(prisma.insight.updateMany).toHaveBeenLastCalledWith({
      where: expect.objectContaining({
        id: 'i-dismissed',
        userId: 'u-1',
        narrationStatus: 'PROCESSING',
        narrationProcessingAt: expect.any(Date),
        status: { not: 'ACTIVE' },
      }),
      data: { narrationStatus: 'NOT_REQUESTED', narrationProcessingAt: null },
    });
  });

  it('does not queue narration when the feature flag is disabled', async () => {
    config.get.mockReturnValue('false');
    expect(service.isEnabled()).toBe(false);
    expect(await service.queueForUser('user-1', 'insight-1')).toEqual({
      queued: false,
      reason: 'disabled',
    });
    expect(prisma.insight.findFirst).not.toHaveBeenCalled();
  });

  it('enforces user ownership when queueing an insight', async () => {
    prisma.insight.findFirst.mockResolvedValue(null);
    await expect(service.queueForUser('user-a', 'insight-owned-by-b'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.insight.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'insight-owned-by-b', userId: 'user-a', status: 'ACTIVE' },
    }));
  });

  it('does not queue an insight that already has a completed narration', async () => {
    prisma.insight.findFirst.mockResolvedValue({ id: 'i-ready', narrationStatus: 'READY' });
    await expect(service.queueForUser('u-1', 'i-ready')).resolves.toEqual({
      queued: false,
      reason: 'already_ready',
    });
    expect(prisma.insight.updateMany).not.toHaveBeenCalled();
  });

  it('queues only an existing active insight and leaves its deterministic fields untouched', async () => {
    prisma.insight.findFirst.mockResolvedValue({ id: 'i-1', narrationStatus: 'NOT_REQUESTED' });
    await expect(service.queueForUser('u-1', 'i-1')).resolves.toEqual({
      queued: true,
      reason: 'queued',
    });
    expect(prisma.insight.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'i-1',
        userId: 'u-1',
        status: 'ACTIVE',
        narrationStatus: { in: ['NOT_REQUESTED', 'FAILED'] },
      },
      data: {
        narrationStatus: 'QUEUED',
        narrative: null,
        narratedAt: null,
        narrationProcessingAt: null,
      },
    });
  });

  it('generates a narrative asynchronously and only updates narration columns', async () => {
    prisma.insight.findMany.mockResolvedValue([{
      id: 'i-1', userId: 'u-1', narrationStatus: 'QUEUED', createdAt: new Date(),
    }]);
    prisma.insight.findFirst.mockResolvedValue({
      id: 'i-1',
      type: 'UNUSUAL_SPENDING',
      severity: 'WARNING',
      title: 'Unusual Spending Spike',
      message: 'You spent 150% more on Groceries this month than your 3-month average.',
      actionUrl: '/transactions',
    });

    await service.processQueue();

    expect(provider.generateWithUsage).toHaveBeenCalledTimes(1);
    expect(prisma.insight.updateMany).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: {
        narrationStatus: 'PROCESSING',
        narrationProcessingAt: expect.any(Date),
      },
    }));
    expect(prisma.insight.updateMany).toHaveBeenNthCalledWith(3, expect.objectContaining({
      where: expect.objectContaining({
        id: 'i-1',
        userId: 'u-1',
        narrationStatus: 'PROCESSING',
        narrationProcessingAt: expect.any(Date),
        status: 'ACTIVE',
      }),
      data: expect.objectContaining({
        narrative: expect.stringContaining('spending'),
        narrationStatus: 'READY',
        narratedAt: expect.any(Date),
        narrationProcessingAt: null,
      }),
    }));
    const narrationUpdate = prisma.insight.updateMany.mock.calls[2][0].data;
    expect(narrationUpdate).not.toHaveProperty('title');
    expect(narrationUpdate).not.toHaveProperty('message');
    expect(narrationUpdate).not.toHaveProperty('severity');
    expect(usage.recordInsightNarration).toHaveBeenCalledWith('u-1', expect.any(Date),
      expect.objectContaining({ succeeded: true, model: 'test-model' }));
  });

  it('extracts the explanation string from Gemini JSON-mode output', async () => {
    prisma.insight.findMany.mockResolvedValue([{
      id: 'i-json', userId: 'u-json', narrationStatus: 'QUEUED', createdAt: new Date(),
    }]);
    prisma.insight.findFirst.mockResolvedValue({
      id: 'i-json',
      type: 'NET_WORTH_MILESTONE',
      severity: 'OPPORTUNITY',
      title: 'Net Worth Milestone: KES 10,000,000',
      message: 'Your total net worth has crossed KES 10,000,000. Great work!',
      actionUrl: '/reports/net-worth',
    });
    provider.generateWithUsage.mockResolvedValue({
      text: JSON.stringify({
        explanation: 'This milestone marks an important point in your recorded financial position. Keep reviewing your assets and liabilities.',
      }),
      inputTokens: 20,
      outputTokens: 25,
      model: 'test-model',
    });

    await service.processQueue();

    expect(prisma.insight.updateMany).toHaveBeenNthCalledWith(3, expect.objectContaining({
      data: expect.objectContaining({
        narrative: expect.not.stringMatching(/^\s*\{/),
        narrationStatus: 'READY',
      }),
    }));
  });

  it('rejects AI output that invents financial numbers', () => {
    expect(() => (service as any).validateNarrative(
      'Your spending increased by 300%. You should review it.',
      'You spent 150% more on Groceries.',
    )).toThrow('introduced a financial number');
  });

  it('rejects unsupported causal claims', () => {
    expect(() => (service as any).validateNarrative(
      'Your spending increased because your income declined.',
      'Your spending increased by 150%.',
    )).toThrow('unsupported causal claim');
  });

  it('accepts narration that does not add unsupported numeric facts', () => {
    expect((service as any).validateNarrative(
      'This category is running higher than its usual level. Review recent purchases.',
      'You spent 150% more on Groceries.',
    )).toContain('running higher');
  });

  it('records provider failures and leaves the deterministic insight available', async () => {
    prisma.insight.findMany.mockResolvedValue([{
      id: 'i-2', userId: 'u-2', narrationStatus: 'QUEUED', createdAt: new Date(),
    }]);
    prisma.insight.findFirst.mockResolvedValue({
      id: 'i-2', type: 'BUDGET_OVERSPENT', severity: 'WARNING',
      title: 'Budget Exceeded', message: 'You exceeded your KES 1,000 budget.',
      actionUrl: '/budgets',
    });
    provider.generateWithUsage.mockRejectedValue(new Error('provider unavailable'));

    await service.processQueue();

    expect(usage.recordInsightNarration).toHaveBeenCalledWith('u-2', expect.any(Date),
      expect.objectContaining({ succeeded: false }));
    expect(prisma.insight.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: {
        narrationStatus: 'FAILED',
        narrative: null,
        narratedAt: null,
        narrationProcessingAt: null,
      },
    }));
  });
});
