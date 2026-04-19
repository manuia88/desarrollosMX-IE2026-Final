import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { optimizePortfolio, type PortfolioCandidate } from '../lib/portfolio/optimizer';

const portfolioCandidateSchema = z.object({
  listing_id: z.string().min(1),
  platform: z.enum(['airbnb', 'vrbo', 'booking']),
  zone_id: z.string().nullable(),
  market_id: z.string().nullable(),
  price_minor: z.number().int().min(1),
  expected_cap_rate: z.number().min(0).max(1),
  expected_revenue_annual_minor: z.number().int().min(0),
  risk_score: z.number().min(0).max(1),
});

export const strPortfolioRouter = router({
  optimize: authenticatedProcedure
    .input(
      z.object({
        candidates: z.array(portfolioCandidateSchema).min(1).max(2_000),
        budget_total_minor: z.number().int().min(1),
        max_listings_per_zone: z.number().int().min(1).max(50).default(3),
        min_cap_rate: z.number().min(0).max(1).default(0.04),
        max_risk: z.number().min(0).max(1).default(0.6),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const candidates: PortfolioCandidate[] = input.candidates.map((c) => ({
          listing_id: c.listing_id,
          platform: c.platform,
          zone_id: c.zone_id,
          market_id: c.market_id,
          price_minor: c.price_minor,
          expected_cap_rate: c.expected_cap_rate,
          expected_revenue_annual_minor: c.expected_revenue_annual_minor,
          risk_score: c.risk_score,
        }));
        return optimizePortfolio(candidates, {
          budget_total_minor: input.budget_total_minor,
          max_listings_per_zone: input.max_listings_per_zone,
          min_cap_rate: input.min_cap_rate,
          max_risk: input.max_risk,
        });
      } catch (err) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: err instanceof Error ? err.message : 'portfolio_optimize_failed',
        });
      }
    }),
});
