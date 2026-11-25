import { BadRequestException } from '@nestjs/common';
import { MpesaImportService } from './mpesa-import.service';
import { MPESA_GOLDEN_FIXTURES } from './mpesa-golden-fixtures';

describe('MpesaImportService', () => {
  const extraction = {
    type: 'EXPENSE',
    amount: 1250,
    currency: 'KES',
    date: '2026-11-24',
    description: 'Payment to merchant',
    counterparty: 'Merchant',
    mpesaReference: 'ABC123XYZ',
    confidence: 0.96,
    uncertainties: [],
  };

  let service: MpesaImportService;
  let aiProvider: { generate: jest.Mock; generateWithUsage?: jest.Mock };
  let prisma: { transaction: { findFirst: jest.Mock }; account: { findFirst: jest.Mock } };
  let transactionsService: { create: jest.Mock };
  let config: { get: jest.Mock };
  let aiUsage: { reserveMpesaParse: jest.Mock; recordMpesaParse: jest.Mock };

  beforeEach(() => {
    aiProvider = { generate: jest.fn().mockResolvedValue(JSON.stringify(extraction)) };
    prisma = {
      transaction: { findFirst: jest.fn().mockResolvedValue(null) },
      account: { findFirst: jest.fn().mockResolvedValue({ currency: 'KES' }) },
    };
    transactionsService = { create: jest.fn().mockResolvedValue({ id: 'created-id' }) };
    aiUsage = {
      reserveMpesaParse: jest.fn().mockResolvedValue(new Date('2026-11-24T00:00:00.000Z')),
      recordMpesaParse: jest.fn().mockResolvedValue(undefined),
    };
    config = {
      get: jest.fn((key: string, fallback?: string) =>
        key === 'AI_MPESA_PARSE_ENABLED' ? 'true' : fallback,
      ),
    };
    service = new MpesaImportService(
      aiProvider as any,
      prisma as any,
      config as any,
      transactionsService as any,
      aiUsage as any,
    );
  });

  it('returns a reviewable draft and does not create a transaction during parsing', async () => {
    const result = await service.parse({ text: 'Confirmed. Ksh1,250 sent to merchant.' }, 'user-id');

    expect(result.draft.amount).toBe(1250);
    expect(result.requiresReview).toBe(true);
    expect(result.canAutoSave).toBe(false);
    expect(transactionsService.create).not.toHaveBeenCalled();
    expect(prisma.transaction.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-id' }) }),
    );
  });

  it('reserves one daily parse and records token usage returned by the provider', async () => {
    aiProvider.generateWithUsage = jest.fn().mockResolvedValue({
      text: JSON.stringify(extraction),
      inputTokens: 321,
      outputTokens: 87,
      model: 'claude-test-model',
    });

    await service.parse({ text: 'Confirmed. Ksh1,250 sent to merchant.' }, 'user-id');

    expect(aiUsage.reserveMpesaParse).toHaveBeenCalledWith('user-id');
    expect(aiUsage.recordMpesaParse).toHaveBeenCalledWith(
      'user-id',
      new Date('2026-11-24T00:00:00.000Z'),
      {
        provider: 'openrouter',
        model: 'claude-test-model',
        inputTokens: 321,
        outputTokens: 87,
        succeeded: true,
      },
    );
  });

  it('records a failed provider attempt against the reserved daily quota', async () => {
    aiProvider.generate.mockRejectedValue(new Error('provider unavailable'));

    await expect(
      service.parse({ text: 'Confirmed. Ksh1,250 sent to merchant.' }, 'user-id'),
    ).rejects.toThrow();

    expect(aiUsage.reserveMpesaParse).toHaveBeenCalledWith('user-id');
    expect(aiUsage.recordMpesaParse).toHaveBeenCalledWith(
      'user-id',
      new Date('2026-11-24T00:00:00.000Z'),
      expect.objectContaining({ inputTokens: 0, outputTokens: 0, succeeded: false }),
    );
  });

  it('passes receipt images to the provider without persisting them', async () => {
    await service.parse(
      { image: { mediaType: 'image/png', data: 'aGVsbG8=' } },
      'user-id',
    );

    expect(aiProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [{ mediaType: 'image/png', data: 'aGVsbG8=' }],
      }),
    );
    expect(transactionsService.create).not.toHaveBeenCalled();
  });

  it('rejects malformed model output', async () => {
    aiProvider.generate.mockResolvedValue('not-json');

    await expect(service.parse({ text: 'some message' }, 'user-id')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('only creates a transaction after explicit confirmation', async () => {
    await service.confirm('user-id', {
      type: 'EXPENSE',
      amount: 1250,
      currency: 'KES',
      date: '2026-11-24',
      description: 'Payment to merchant',
      accountId: 'account-id',
      mpesaReference: 'ABC123XYZ',
    } as any);

    expect(transactionsService.create).toHaveBeenCalledTimes(1);
    expect(transactionsService.create).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ mpesaReference: 'ABC123XYZ' }),
      'IMPORTED',
    );
  });

  it('does not create an ordinary transaction for a transfer draft', async () => {
    await expect(
      service.confirm('user-id', {
        type: 'TRANSFER',
        amount: 1250,
        currency: 'KES',
        date: '2026-11-24',
        description: 'Transfer',
        accountId: 'account-id',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(transactionsService.create).not.toHaveBeenCalled();
  });
});


describe('M-Pesa golden SMS extraction contracts', () => {
  it.each(MPESA_GOLDEN_FIXTURES)(
    'returns the expected reviewed draft for $id',
    async ({ sms, expected }) => {
      const provider = { generate: jest.fn().mockResolvedValue(JSON.stringify(expected)) };
      const database = {
        transaction: { findFirst: jest.fn().mockResolvedValue(null) },
        account: { findFirst: jest.fn() },
      };
      const transactionWriter = { create: jest.fn() };
      const settings = {
        get: jest.fn((_key: string, fallback?: string) =>
          _key === 'AI_MPESA_PARSE_ENABLED' ? 'true' : fallback,
        ),
      };
      const parser = new MpesaImportService(
        provider as any,
        database as any,
        settings as any,
        transactionWriter as any,
        {
          reserveMpesaParse: jest.fn().mockResolvedValue(new Date('2026-11-24T00:00:00.000Z')),
          recordMpesaParse: jest.fn().mockResolvedValue(undefined),
        } as any,
      );

      const result = await parser.parse({ text: sms }, 'user-id');

      expect(result.draft).toEqual(expected);
      expect(result.requiresReview).toBe(true);
      expect(result.canAutoSave).toBe(false);
      expect(transactionWriter.create).not.toHaveBeenCalled();
    },
  );
});
