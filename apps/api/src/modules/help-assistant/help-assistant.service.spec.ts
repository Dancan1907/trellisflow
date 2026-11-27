import { ForbiddenException } from '@nestjs/common';
import { HelpAssistantService } from './help-assistant.service';

describe('HelpAssistantService', () => {
  const userId = '00000000-0000-4000-8000-000000000001';
  let prisma: { $queryRawUnsafe: jest.Mock };
  let config: { get: jest.Mock };
  let provider: { generateWithUsage: jest.Mock };
  let usage: { reserveHelpAssistant: jest.Mock; recordHelpAssistant: jest.Mock };
  let service: HelpAssistantService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([{
        id: 'chunk-1',
        source: '05-reports-forecasts-and-insights.md',
        title: 'Reports, cash-flow forecasts and insights',
        heading: 'Cash-flow forecast',
        route: '/reports/cash-flow-forecast',
        content: 'Open Reports and select Cash-flow Forecast.',
        distance: 0.12,
      }]),
    };
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'AI_HELP_ASSISTANT_ENABLED') return 'true';
        if (key === 'AI_PROVIDER') return 'gemini';
        if (key === 'GEMINI_API_KEY') return 'test-key';
        if (key === 'GEMINI_EMBEDDING_MODEL') return 'gemini-embedding-001';
        return fallback;
      }),
    };
    provider = {
      generateWithUsage: jest.fn().mockResolvedValue({
        text: JSON.stringify({ answer: 'Open Reports, then choose Cash-flow Forecast. [1]', citedSources: [1] }),
        inputTokens: 100,
        outputTokens: 30,
        model: 'test-model',
      }),
    };
    usage = {
      reserveHelpAssistant: jest.fn().mockResolvedValue(new Date('2026-11-27T00:00:00Z')),
      recordHelpAssistant: jest.fn().mockResolvedValue(undefined),
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: Array(768).fill(0.01) } }),
    }) as unknown as typeof fetch;
    service = new HelpAssistantService(prisma as any, config as any, provider as any, usage as any);
  });

  afterAll(() => { global.fetch = originalFetch; });

  it('retrieves relevant documentation and returns validated source citations and navigation', async () => {
    const result = await service.chat(userId, { message: 'Where is the cash-flow forecast?' });
    expect(result.answer).toContain('Cash-flow Forecast');
    expect(result.sources).toEqual([expect.objectContaining({ source: '05-reports-forecasts-and-insights.md' })]);
    expect(result.navigation).toEqual({ label: 'Cash-flow Forecast', route: '/reports/cash-flow-forecast' });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('embedding'), expect.stringMatching(/^\[/));
    expect(usage.recordHelpAssistant).toHaveBeenCalledWith(userId, expect.any(Date), expect.objectContaining({
      provider: 'gemini', model: 'test-model', inputTokens: 100, outputTokens: 30, succeeded: true,
    }));
  });

  it('returns a grounded no-answer response when no chunk meets the relevance threshold', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{ id: 'weak', distance: 0.9 }]);
    const result = await service.chat(userId, { message: 'How do I configure an unsupported integration?' });
    expect(result.sources).toEqual([]);
    expect(provider.generateWithUsage).not.toHaveBeenCalled();
  });

  it('drops model citations that do not refer to retrieved chunks', async () => {
    provider.generateWithUsage.mockResolvedValue({
      text: JSON.stringify({ answer: 'Answer with an invalid citation. [99]', citedSources: [99] }),
      inputTokens: 1, outputTokens: 1, model: 'test-model',
    });
    const result = await service.chat(userId, { message: 'Where is the forecast?' });
    expect(result.sources).toEqual([]);
    expect(result.navigation).toBeNull();
  });


  it('uses the requested cash-flow forecast route instead of a parent Reports route', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{
      id: 'forecast', source: '05-reports-forecasts-and-insights.md',
      title: 'Reports, cash-flow forecasts and insights', heading: 'Cash-flow forecast',
      route: '/reports', content: 'Open Reports then Cash-flow Forecast.', distance: 0.1,
    }]);
    const result = await service.chat(userId, { message: 'Where can I view my cash-flow forecast?' });
    expect(result.navigation).toEqual({ label: 'Cash-flow Forecast', route: '/reports/cash-flow-forecast' });
    expect(result.sources[0]?.route).toBe('/reports/cash-flow-forecast');
  });

  it('resolves explicit Settings navigation independently of retrieved document routes', async () => {
    const result = await service.chat(userId, { message: 'Take me to settings page' });
    expect(result.navigation).toEqual({ label: 'Settings', route: '/settings' });
  });

  it('resolves Businesses to its own route rather than the Investments guide route', async () => {
    prisma.$queryRawUnsafe.mockResolvedValue([{
      id: 'businesses', source: '04-investments-and-businesses.md',
      title: 'Investments and businesses', heading: 'Businesses',
      route: '/investments', content: 'Open Businesses at /businesses.', distance: 0.1,
    }]);
    const result = await service.chat(userId, { message: 'Take me to my Businesses page' });
    expect(result.navigation).toEqual({ label: 'Businesses', route: '/businesses' });
    expect(result.sources[0]?.route).toBe('/businesses');
  });

  it('resolves Goals and Debt to their own destinations', async () => {
    const goals = await service.chat(userId, { message: 'Take me to my goals page' });
    expect(goals.navigation).toEqual({ label: 'Goals', route: '/goals' });
    const debt = await service.chat(userId, { message: 'Take me to my debts page' });
    expect(debt.navigation).toEqual({ label: 'Debt', route: '/debts' });
  });

  it('does not allow the feature to run while disabled', async () => {
    config.get.mockImplementation((key: string, fallback?: string) =>
      key === 'AI_HELP_ASSISTANT_ENABLED' ? 'false' : fallback,
    );
    await expect(service.chat(userId, { message: 'How do I use budgets?' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(usage.reserveHelpAssistant).not.toHaveBeenCalled();
  });

  it('treats retrieved documentation as untrusted prompt context', async () => {
    await service.chat(userId, { message: 'How do I view the forecast?' });
    const request = provider.generateWithUsage.mock.calls[0][0];
    expect(request.systemPrompt).toContain('untrusted reference data');
    expect(request.userPrompt).toContain('Content (untrusted reference)');
  });
});
