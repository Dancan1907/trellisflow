import { NaturalLanguageDraftSchema } from './natural-language-draft.schema';

describe('NaturalLanguageDraftSchema', () => {
  const validDraft = {
    type: 'EXPENSE',
    amount: 850,
    date: '2026-11-25',
    description: 'Lunch',
    accountHint: 'M-Pesa',
    categoryHint: 'Food',
    fromAccountHint: null,
    toAccountHint: null,
    notes: null,
    confidence: 0.94,
    uncertainties: [],
  };

  it('accepts a valid expense draft with account and category hints', () => {
    expect(NaturalLanguageDraftSchema.parse(validDraft)).toEqual(validDraft);
  });

  it('accepts a transfer with separate source and destination hints', () => {
    const result = NaturalLanguageDraftSchema.parse({
      ...validDraft,
      type: 'TRANSFER',
      accountHint: null,
      categoryHint: null,
      fromAccountHint: 'M-Pesa',
      toAccountHint: 'Savings',
    });
    expect(result.fromAccountHint).toBe('M-Pesa');
    expect(result.toAccountHint).toBe('Savings');
  });

  it('rejects zero/negative amounts and malformed dates', () => {
    expect(NaturalLanguageDraftSchema.safeParse({ ...validDraft, amount: 0 }).success).toBe(false);
    expect(NaturalLanguageDraftSchema.safeParse({ ...validDraft, amount: -5 }).success).toBe(false);
    expect(NaturalLanguageDraftSchema.safeParse({ ...validDraft, date: '25/11/2026' }).success).toBe(false);
  });

  it('rejects blank hints and unexpected model fields', () => {
    expect(NaturalLanguageDraftSchema.safeParse({ ...validDraft, accountHint: '   ' }).success).toBe(false);
    expect(NaturalLanguageDraftSchema.safeParse({ ...validDraft, accountId: 'forged-id' }).success).toBe(false);
  });
});
