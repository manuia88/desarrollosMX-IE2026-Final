// F14.F.12 mini-cleanup — Instagram publisher STUB ADR-018.
// STUB — activar H2 cuando founder valide PMF + complete Meta Graph API approval.
//
// TODO list activar H2:
//   1. Meta App Developer Console signup (developers.facebook.com)
//   2. Crear App tipo "Business" con producto Instagram Graph API
//   3. Solicitar permission instagram_content_publish (App Review 3-7 días)
//   4. Validar Business / Creator account requirement (asesor connecta IG profesional)
//   5. Generar tokens en Test mode (developers) → producción tras review
//   6. Implementar OAuth flow: redirect → code → exchange short-lived token →
//      long-lived token (60d) con grant_type=ig_exchange_token
//   7. Implementar publish via Container API:
//        a. POST /{ig-user-id}/media (video_url + caption)
//        b. Poll status_code GET /{container-id}?fields=status_code (FINISHED)
//        c. POST /{ig-user-id}/media_publish (creation_id)
//   8. Implementar getStatus via /{post-id}/insights (impressions, likes)
//   9. Persistir tokens en studio_social_tokens (tabla H2 nueva, NO crear H1)
//  10. Registrar webhook subscription para invalidaciones token expirado
//
// Memoria canon: zero gasto sin validación previa (founder OK requerido pre-signup).
// Memoria canon: zero hardcode tokens reales H1.

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

const STUB_INSTAGRAM_MESSAGE =
  'STUB ADR-018 — activar H2 cuando founder valide PMF + complete Meta Graph API approval ' +
  '(3-7 días review). Pending: Meta App Developer Console signup + instagram_content_publish ' +
  'permission request + Business/Creator account requirement + Test mode + production mode ' +
  'tokens. L-NEW-STUDIO-INSTAGRAM-PUBLISH-ACTIVATE.';

class InstagramPublisher implements ISocialPublisher {
  readonly platform: SocialPlatform = 'instagram';

  async publish(_input: SocialPublishInput): Promise<SocialPublishResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_INSTAGRAM_MESSAGE,
    });
  }

  async getStatus(_input: SocialStatusInput): Promise<SocialStatusResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_INSTAGRAM_MESSAGE,
    });
  }

  async getOAuthUrl(_input: SocialOAuthUrlInput): Promise<SocialOAuthUrlResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_INSTAGRAM_MESSAGE,
    });
  }

  async exchangeCode(_input: SocialOAuthExchangeInput): Promise<SocialOAuthTokens> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_INSTAGRAM_MESSAGE,
    });
  }
}

export const instagramPublisher: ISocialPublisher = new InstagramPublisher();
export const STUB_INSTAGRAM_PUBLISHER_MESSAGE = STUB_INSTAGRAM_MESSAGE;
