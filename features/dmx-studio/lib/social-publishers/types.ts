// F14.F.12 mini-cleanup — DMX Studio Social Publishers canon types.
// Pattern adapter resolver (referencia F14.F.4 portales import). STUB ADR-018:
// activación H2 cuando founder valide PMF + complete API approvals
// (Meta Graph API IG/FB 3-7 días review, TikTok for Business 1-2 semanas).

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook';

export interface SocialPublishInput {
  readonly videoUrl: string;
  readonly caption: string;
  readonly hashtags: ReadonlyArray<string>;
  readonly accessToken: string;
}

export interface SocialPublishResult {
  readonly externalPostId: string;
  readonly url: string;
}

export interface SocialStatusInput {
  readonly postId: string;
  readonly accessToken: string;
}

export interface SocialPostMetrics {
  readonly views: number;
  readonly likes: number;
}

export interface SocialStatusResult {
  readonly status: 'pending' | 'published' | 'failed';
  readonly metrics?: SocialPostMetrics;
}

export interface SocialOAuthUrlInput {
  readonly redirectUri: string;
  readonly state: string;
}

export interface SocialOAuthUrlResult {
  readonly authUrl: string;
}

export interface SocialOAuthExchangeInput {
  readonly code: string;
  readonly redirectUri: string;
}

export interface SocialOAuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export interface ISocialPublisher {
  readonly platform: SocialPlatform;
  publish(input: SocialPublishInput): Promise<SocialPublishResult>;
  getStatus(input: SocialStatusInput): Promise<SocialStatusResult>;
  getOAuthUrl(input: SocialOAuthUrlInput): Promise<SocialOAuthUrlResult>;
  exchangeCode(input: SocialOAuthExchangeInput): Promise<SocialOAuthTokens>;
}
