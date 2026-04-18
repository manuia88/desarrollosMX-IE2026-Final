import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { convert, getLatestRate } from '@/shared/lib/currency/fx';

const currencyCode = z
  .string()
  .length(3)
  .regex(/^[A-Z]{3}$/, 'ISO 4217 currency code');

export const fxRouter = router({
  convert: authenticatedProcedure
    .input(
      z.object({
        amount: z.number().finite(),
        from: currencyCode,
        to: currencyCode,
      }),
    )
    .query(async ({ input }) => {
      const converted = await convert(input.amount, input.from, input.to);
      if (converted === null) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No FX rate available for ${input.from}->${input.to}`,
        });
      }
      return { amount: converted, from: input.from, to: input.to };
    }),
  rate: authenticatedProcedure
    .input(z.object({ from: currencyCode, to: currencyCode }))
    .query(async ({ input }) => {
      const rate = await getLatestRate(input.from, input.to);
      return { rate, from: input.from, to: input.to };
    }),
});
