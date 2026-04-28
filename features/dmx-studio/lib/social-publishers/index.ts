// F14.F.12 mini-cleanup — Social Publishers registry resolver.
// Pattern adapter resolver canon (referencia F14.F.4 portales import).
// 3 publishers stub ADR-018 — activación H2 post-PMF + API approvals.

import { facebookPublisher } from './facebook';
import { instagramPublisher } from './instagram';
import { tiktokPublisher } from './tiktok';
import type { ISocialPublisher, SocialPlatform } from './types';

const PUBLISHERS: Readonly<Record<SocialPlatform, ISocialPublisher>> = {
  instagram: instagramPublisher,
  tiktok: tiktokPublisher,
  facebook: facebookPublisher,
} as const;

const SUPPORTED_PLATFORMS: ReadonlyArray<SocialPlatform> = [
  'instagram',
  'tiktok',
  'facebook',
] as const;

export function getPublisher(platform: SocialPlatform): ISocialPublisher {
  return PUBLISHERS[platform];
}

export function getSupportedPlatforms(): ReadonlyArray<SocialPlatform> {
  return SUPPORTED_PLATFORMS;
}

export type {
  ISocialPublisher,
  SocialOAuthExchangeInput,
  SocialOAuthTokens,
  SocialOAuthUrlInput,
  SocialOAuthUrlResult,
  SocialPlatform,
  SocialPostMetrics,
  SocialPublishInput,
  SocialPublishResult,
  SocialStatusInput,
  SocialStatusResult,
} from './types';
