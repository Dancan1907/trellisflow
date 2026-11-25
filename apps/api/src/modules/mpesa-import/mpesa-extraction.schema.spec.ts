import { MpesaExtractionSchema } from './mpesa-extraction.schema';
import { MPESA_GOLDEN_FIXTURES } from './mpesa-golden-fixtures';

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

  it('preserves unsupported events instead of forcing an income or expense classification', () => {
    const result = MpesaExtractionSchema.parse({
      ...validDraft,
      type: 'UNSUPPORTED',
      uncertainties: ['This appears to be a balance inquiry.'],
    });

    expect(result.type).toBe('UNSUPPORTED');
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


describe('M-Pesa golden SMS fixtures', () => {
  it.each(MPESA_GOLDEN_FIXTURES)(
    'validates the expected extraction for $id ($description)',
    ({ expected }) => {
      expect(MpesaExtractionSchema.parse(expected)).toEqual(expected);
    },
  );
});
