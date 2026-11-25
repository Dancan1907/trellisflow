import { z } from 'zod';

const optionalHint = z.string().trim().max(120).nullable();

export const NaturalLanguageDraftSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(200),
  accountHint: optionalHint,
  categoryHint: optionalHint,
  fromAccountHint: optionalHint,
  toAccountHint: optionalHint,
  notes: z.string().trim().max(500).nullable(),
  confidence: z.number().min(0).max(1),
  uncertainties: z.array(z.string().trim().min(1).max(200)).max(10),
}).strict();

export type NaturalLanguageDraft = z.infer<typeof NaturalLanguageDraftSchema>;
