import { z } from 'zod';

/**
 * This schema is the trust boundary between model output and application data.
 * Missing or ambiguous values stay null; they are never guessed from context.
 */
export const MpesaExtractionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: z.number().positive().finite(),
  currency: z.string().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(1).max(200),
  counterparty: z.string().trim().max(120).nullable(),
  mpesaReference: z.string().trim().min(1).max(32).transform((value) => value.toUpperCase()).nullable(),
  confidence: z.number().min(0).max(1),
  uncertainties: z.array(z.string().trim().min(1).max(200)).max(10),
});

export type MpesaExtractionDraft = z.infer<typeof MpesaExtractionSchema>;
