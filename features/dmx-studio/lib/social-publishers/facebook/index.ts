// F14.F.12 mini-cleanup — Facebook publisher STUB ADR-018.
// STUB — activar H2 cuando founder valide PMF + complete Facebook Graph API approval.
//
// TODO list activar H2:
//   1. Facebook App Developer Console signup (developers.facebook.com)
//   2. Crear App tipo "Business" con producto Pages API
//   3. Solicitar permissions pages_manage_posts + pages_read_engagement (App Review)
//   4. Business verification (Manager → ID + tax doc)
//   5. Generar long-lived access token (60 días) via /oauth/access_token
//   6. Implementar OAuth flow Page-level: user token → page token con
//      /me/accounts (extract page access_token)
//   7. Implementar publish video via /{page-id}/videos (file_url + description)
//   8. Polling /{video-id}?fields=status hasta status === ready
//   9. Implementar getStatus via /{post-id}/insights (post_video_views, likes)
//  10. Persistir tokens en studio_social_tokens (tabla H2 nueva)
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

const STUB_FACEBOOK_MESSAGE =
  'STUB ADR-018 — activar H2 cuando founder valide PMF + complete Facebook Graph API approval. ' +
  'Pending: Facebook App Developer Console + Pages API permission + business verification + ' +
  'access token long-lived. L-NEW-STUDIO-FACEBOOK-PUBLISH-ACTIVATE.';

class FacebookPublisher implements ISocialPublisher {
  readonly platform: SocialPlatform = 'facebook';

  async publish(_input: SocialPublishInput): Promise<SocialPublishResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_FACEBOOK_MESSAGE,
    });
  }

  async getStatus(_input: SocialStatusInput): Promise<SocialStatusResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_FACEBOOK_MESSAGE,
    });
  }

  async getOAuthUrl(_input: SocialOAuthUrlInput): Promise<SocialOAuthUrlResult> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_FACEBOOK_MESSAGE,
    });
  }

  async exchangeCode(_input: SocialOAuthExchangeInput): Promise<SocialOAuthTokens> {
    // STUB — activar H2
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message: STUB_FACEBOOK_MESSAGE,
    });
  }
}

export const facebookPublisher: ISocialPublisher = new FacebookPublisher();
export const STUB_FACEBOOK_PUBLISHER_MESSAGE = STUB_FACEBOOK_MESSAGE;
