import { BadRequestException } from '@nestjs/common';
import { MpesaImportService } from './mpesa-import.service';

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
  let aiProvider: { generate: jest.Mock };
  let prisma: { transaction: { findFirst: jest.Mock }; account: { findFirst: jest.Mock } };
  let transactionsService: { create: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    aiProvider = { generate: jest.fn().mockResolvedValue(JSON.stringify(extraction)) };
    prisma = {
      transaction: { findFirst: jest.fn().mockResolvedValue(null) },
      account: { findFirst: jest.fn().mockResolvedValue({ currency: 'KES' }) },
    };
    transactionsService = { create: jest.fn().mockResolvedValue({ id: 'created-id' }) };
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
