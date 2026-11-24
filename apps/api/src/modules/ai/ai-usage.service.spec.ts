import { HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';

describe('AiUsageService', () => {
  const usageDate = new Date('2026-11-24T00:00:00.000Z');
  let prisma: {
    $queryRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let config: { get: jest.Mock };
  let service: AiUsageService;
  let dailyUpdate: jest.Mock;
  let eventCreate: jest.Mock;

  beforeEach(() => {
    dailyUpdate = jest.fn().mockResolvedValue({});
    eventCreate = jest.fn().mockResolvedValue({});
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'reservation-id' }]),
      $transaction: jest.fn(async (callback: (tx: any) => Promise<void>) =>
        callback({
          aiUsageDaily: { update: dailyUpdate },
          aiUsageEvent: { create: eventCreate },
        }),
      ),
    };
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'AI_MPESA_DAILY_LIMIT') return '20';
        return fallback;
      }),
    };
    service = new AiUsageService(prisma as any, config as any);
  });

  it('atomically reserves capacity using the configured per-user daily limit', async () => {
    await expect(service.reserveMpesaParse('00000000-0000-4000-8000-000000000001'))
      .resolves.toBeInstanceOf(Date);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    const query = prisma.$queryRaw.mock.calls[0][0].join('?');
    expect(query).toContain('ON CONFLICT');
    expect(query).toContain('"request_count" < ?');
    expect(prisma.$queryRaw.mock.calls[0].slice(1)).toContain(20);
  });

  it('rejects when the atomic reservation reports the daily quota is exhausted', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    await expect(
      service.reserveMpesaParse('00000000-0000-4000-8000-000000000001'),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('fails closed when the usage database cannot reserve capacity', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.reserveMpesaParse('00000000-0000-4000-8000-000000000001'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('persists token counts and an optional estimated cost without source content', async () => {
    config.get.mockImplementation((key: string, fallback?: string) => {
      const values: Record<string, string> = {
        AI_INPUT_COST_PER_MILLION_USD: '3',
        AI_OUTPUT_COST_PER_MILLION_USD: '15',
      };
      return values[key] ?? fallback;
    });

    await service.recordMpesaParse(
      '00000000-0000-4000-8000-000000000001',
      usageDate,
      {
        provider: 'anthropic',
        model: 'claude-test-model',
        inputTokens: 1000,
        outputTokens: 200,
      },
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    expect(dailyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { inputTokens: { increment: 1000 }, outputTokens: { increment: 200 } },
      }),
    );
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider: 'anthropic',
          model: 'claude-test-model',
          inputTokens: 1000,
          outputTokens: 200,
          estimatedCostUsd: '0.00600000',
        }),
      }),
    );
  });
});
