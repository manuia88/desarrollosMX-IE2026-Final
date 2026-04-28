// F14.F.12 mini-cleanup — TikTok publisher STUB ADR-018.
// STUB — activar H2 cuando founder valide PMF + complete TikTok for Business approval.
//
// TODO list activar H2:
//   1. TikTok Developer signup (developers.tiktok.com)
//   2. Crear App con producto Content Posting API
//   3. Solicitar permission video.publish (App Review 1-2 semanas)
//   4. TikTok for Business account verification (Manager / Business)
//   5. Implementar OAuth v2 flow: authorize → access_token + refresh_token
//   6. Implementar publish via /v2/post/publish/video/init/ (FILE_UPLOAD source)
//      o PULL_FROM_URL si video accesible público
//   7. Polling /v2/post/publish/status/fetch/ hasta PUBLISH_COMPLETE
//   8. Implementar getStatus via /v2/research/video/query/ (insights)
//   9. Persistir tokens en studio_social_tokens (tabla H2 nueva)
//  10. Refresh token cron antes de expiración (24h access, 365d refresh)
//
// Memoria canon: zero gasto sin validación previa (founder OK requerido pre-signup).

import { TRPCError } from '@trpc/server';
import type {
  ISocialPublisher,
  SocialOAuthExchangeInput,
  SocialOAuthTokens,
  SocialOAuthUrlInput,
  SocialOAuthUrlResult,
  SocialPlatform,
  SocialPublishInput,
  SocialPublishResult,
  SocialStatusInput,
  SocialStatusResult,
} from '../types';

const STUB_TIKTOK_MESSAGE =
  'STUB ADR-018 — activar H2 cuando founder valide PMF + complete TikTok for Business approval ' +
  '(1-2 semanas). Pending: TikTok Developer signup + Content Posting API approval + TikTok for ' +
  'Business account verification. L-NEW-STUDIO-TIKTOK-PUBLISH-ACTIVATE.';

class TiktokPublisher implements ISocialPublisher {
  readonly platform: SocialPlatform = 'tiktok';

  async publish(_input: SocialPublishInput): Promise<SocialPublishResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_TIKTOK_MESSAGE,
    });
  }

  async getStatus(_input: SocialStatusInput): Promise<SocialStatusResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_TIKTOK_MESSAGE,
    });
  }

  async getOAuthUrl(_input: SocialOAuthUrlInput): Promise<SocialOAuthUrlResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_TIKTOK_MESSAGE,
    });
  }

  async exchangeCode(_input: SocialOAuthExchangeInput): Promise<SocialOAuthTokens> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_TIKTOK_MESSAGE,
    });
  }
}

export const tiktokPublisher: ISocialPublisher = new TiktokPublisher();
export const STUB_TIKTOK_PUBLISHER_MESSAGE = STUB_TIKTOK_MESSAGE;
