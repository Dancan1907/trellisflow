import { ForbiddenException, BadGatewayException } from '@nestjs/common';
import { MoneyCopilotService } from './money-copilot.service';

describe('MoneyCopilotService', () => {
  const provider = { generateWithUsage: jest.fn(), generate: jest.fn() };
  const usage = { reserveMoneyCopilot: jest.fn(), recordMoneyCopilot: jest.fn() };
  const data = { buildContext: jest.fn() };
  const config = { get: jest.fn((key: string, fallback?: string) =>
    key === 'AI_MONEY_COPILOT_ENABLED' ? 'true' : fallback,
  ) };
  let service: MoneyCopilotService;

  beforeEach(() => {
    jest.clearAllMocks();
    usage.reserveMoneyCopilot.mockResolvedValue(new Date('2026-11-26T00:00:00Z'));
    usage.recordMoneyCopilot.mockResolvedValue(undefined);
    data.buildContext.mockResolvedValue({ asOf: '2026-11-26', cashFlow: [] });
    provider.generateWithUsage.mockResolvedValue({
      text: JSON.stringify({ answer: 'Your recorded income was KES 10,000.' }),
      inputTokens: 100, outputTokens: 20, model: 'test-model',
    });
    service = new MoneyCopilotService(provider as any, usage as any, data as any, config as any);
  });

  it('returns a read-only answer grounded in backend context', async () => {
    const result = await service.chat('user-1', { message: 'Summarize my finances' });
    expect(result.answer).toContain('KES 10,000');
    expect(result.readOnly).toBe(true);
    expect(data.buildContext).toHaveBeenCalledWith('user-1', 'Summarize my finances');
    expect(usage.recordMoneyCopilot).toHaveBeenCalledWith(
      'user-1', expect.any(Date), expect.objectContaining({ succeeded: true, inputTokens: 100 }),
    );
  });

  it('rejects when the feature flag is disabled without reserving quota', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'AI_MONEY_COPILOT_ENABLED' ? 'false' : fallback,
    );
    await expect(service.chat('user-1', { message: 'Hello' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(usage.reserveMoneyCopilot).not.toHaveBeenCalled();
  });

  it('rejects malformed model output and records failed usage', async () => {
    provider.generateWithUsage.mockResolvedValue({ text: 'not-json', inputTokens: 2, outputTokens: 2, model: 'x' });
    await expect(service.chat('user-1', { message: 'Hello' })).rejects.toBeInstanceOf(BadGatewayException);
    expect(usage.recordMoneyCopilot).toHaveBeenCalledWith(
      'user-1', expect.any(Date), expect.objectContaining({ succeeded: false }),
    );
  });

  it('does not let a usage-event write failure hide a successful answer', async () => {
    usage.recordMoneyCopilot.mockRejectedValue(new Error('database unavailable'));
    await expect(service.chat('user-1', { message: 'Hello' })).resolves.toMatchObject({ readOnly: true });
  });
});
