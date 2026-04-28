// F14.F.12 mini-cleanup — Social Publishers tRPC router (STUB ADR-018 H2).
//
// 4 señales canon ADR-018:
//   (1) STUB comment + heuristic message en cada throw NOT_IMPLEMENTED
//   (2) tRPC throws NOT_IMPLEMENTED en publishVideo, getOAuthUrl, getPostStatus
//   (3) UI flag visible (SocialPublishButton + PublishingPlatformCard muestran "STUB H2")
//   (4) L-NEW pointer per platform (instagram/tiktok/facebook) en mensajes throw
//
// Activación H2 cuando founder valide PMF + complete API approvals:
//   - Meta Graph API (IG + FB): 3-7 días review
//   - TikTok for Business: 1-2 semanas

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  getPublisher,
  getSupportedPlatforms,
  type SocialPlatform,
} from '@/features/dmx-studio/lib/social-publishers';
import { publicProcedure, router } from '@/server/trpc/init';
import { studioProcedure } from './_studio-procedure';

const platformSchema = z.enum(['instagram', 'tiktok', 'facebook']);

const getOAuthUrlInput = z.object({
  platform: platformSchema,
  redirectUri: z.string().url(),
  state: z.string().min(1).max(256),
});

const publishVideoInput = z.object({
  projectId: z.string().uuid(),
  platform: platformSchema,
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string().min(1).max(64)).max(30).default([]),
});

const getPostStatusInput = z.object({
  postId: z.string().min(1),
  platform: platformSchema,
});

export const socialPublishersRouter = router({
  listSupportedPlatforms: publicProcedure.query(() => {
    const platforms = getSupportedPlatforms();
    return {
      platforms,
      stubH2: true,
      stubMessage:
        'STUB ADR-018 — Sprint 11+12 H2 (post-aprobación API + PMF validation). ' +
        'Publicación social media (IG/TikTok/Facebook) deferida hasta founder valide PMF + ' +
        'complete Meta + TikTok approval (3-7 días review).',
    };
  }),

  getOAuthUrl: studioProcedure.input(getOAuthUrlInput).mutation(async ({ input }) => {
    // STUB — activar H2
    const publisher = getPublisher(input.platform satisfies SocialPlatform);
    try {
      const result = await publisher.getOAuthUrl({
        redirectUri: input.redirectUri,
        state: input.state,
      });
      return result;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'oauth url failed',
      });
    }
  }),

  publishVideo: studioProcedure.input(publishVideoInput).mutation(async ({ input }) => {
    // STUB — activar H2 cuando founder valide PMF + complete API approval.
    // Caption + hashtags se persistirían en studio_social_posts (tabla H2 nueva).
    const publisher = getPublisher(input.platform satisfies SocialPlatform);
    try {
      const result = await publisher.publish({
        videoUrl: '',
        caption: input.caption,
        hashtags: input.hashtags,
        accessToken: '',
      });
      return result;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'publish failed',
      });
    }
  }),

  getPostStatus: studioProcedure.input(getPostStatusInput).query(async ({ input }) => {
    // STUB — activar H2
    const publisher = getPublisher(input.platform satisfies SocialPlatform);
    try {
      const result = await publisher.getStatus({
        postId: input.postId,
        accessToken: '',
      });
      return result;
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: err instanceof Error ? err.message : 'status failed',
      });
    }
  }),
});
