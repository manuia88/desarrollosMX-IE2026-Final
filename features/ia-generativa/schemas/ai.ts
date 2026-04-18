import { z } from 'zod';

export const aiAskInputSchema = z.object({
  query: z.string().min(2).max(2000),
  context_summary: z.string().max(2000).optional(),
});

export type AiAskInput = z.infer<typeof aiAskInputSchema>;
