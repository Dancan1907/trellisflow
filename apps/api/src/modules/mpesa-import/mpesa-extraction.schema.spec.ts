import { MpesaExtractionSchema } from './mpesa-extraction.schema';

describe('MpesaExtractionSchema', () => {
  const validDraft = {
    type: 'EXPENSE',
    amount: 1250,
    currency: 'kes',
    date: '2026-11-24',
    description: 'Payment to merchant',
    counterparty: 'Merchant',
    mpesaReference: 'abc123xyz',
    confidence: 0.96,
    uncertainties: [],
  };

  it('normalizes currency and reference values', () => {
    const result = MpesaExtractionSchema.parse(validDraft);

    expect(result.currency).toBe('KES');
    expect(result.mpesaReference).toBe('ABC123XYZ');
  });

  it('accepts missing counterparty and reference as explicit null values', () => {
    const result = MpesaExtractionSchema.parse({
      ...validDraft,
      counterparty: null,
      mpesaReference: null,
    });

    expect(result.counterparty).toBeNull();
    expect(result.mpesaReference).toBeNull();
  });

  it('rejects zero or negative amounts', () => {
    expect(
      MpesaExtractionSchema.safeParse({ ...validDraft, amount: 0 }).success,
    ).toBe(false);
    expect(
      MpesaExtractionSchema.safeParse({ ...validDraft, amount: -100 }).success,
    ).toBe(false);
  });

  it('rejects malformed currency, date, and confidence values', () => {
    expect(
      MpesaExtractionSchema.safeParse({ ...validDraft, currency: 'KES1' }).success,
    ).toBe(false);
    expect(
      MpesaExtractionSchema.safeParse({ ...validDraft, date: '24/11/2026' }).success,
    ).toBe(false);
    expect(
      MpesaExtractionSchema.safeParse({ ...validDraft, confidence: 1.5 }).success,
    ).toBe(false);
  });
});
