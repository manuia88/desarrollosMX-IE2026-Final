// FASE 11.J — Double opt-in + unsubscribe tokens.
//
// Tokens HMAC-SHA256 con secret `NEWSLETTER_TOKEN_SECRET`. NO se usa
// jsonwebtoken lib (regla inviolable: zero nuevas deps sin approval); en su
// lugar usamos `node:crypto` built-in.
//
// Formato del token: base64url(payload) + '.' + base64url(signature)
//   payload  = JSON { kind, email, subscriberId, issuedAt, expiresAt }
//   signature = HMAC-SHA256(secret, payload_base64)
//
// `kind ∈ {'confirm','unsubscribe'}` — el consumer exige el mismo kind del
// token generado (no se puede usar un unsubscribe token como confirm).
//
// En DB guardamos `sha256hex(token)` (no el token raw) — esto permite
// verificar que el token provisto coincide con el emitido, incluso si la
// firma fue correcta (single-use via invalidación del hash).

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type TokenKind = 'confirm' | 'unsubscribe';

const CONFIRM_TTL_SEC = 7 * 24 * 60 * 60; // 7 días
const UNSUB_TTL_SEC = 365 * 24 * 60 * 60; // 1 año (CAN-SPAM: link perenne)

interface TokenPayload {
  readonly k: TokenKind;
  readonly e: string;
  readonly s: string;
  readonly i: number; // issuedAt
  readonly x: number; // expiresAt
}

function requireSecret(): string {
  const s = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!s || s.length < 16) {
    // En test runtime permitimos un secret default determinista.
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return 'test-secret-dmx-newsletter-hmac-key-do-not-use-in-prod';
    }
    throw new Error(
      'NEWSLETTER_TOKEN_SECRET missing or too short (min 16 chars). ' +
        'Set env var before minting tokens.',
    );
  }
  return s;
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(text: string): Buffer {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

function signPayload(payloadB64: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(payloadB64).digest();
  return base64urlEncode(sig);
}

function mintToken(kind: TokenKind, email: string, subscriberId: string, ttlSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    k: kind,
    e: email.toLowerCase().trim(),
    s: subscriberId,
    i: now,
    x: now + ttlSec,
  };
  const json = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(Buffer.from(json, 'utf8'));
  const sig = signPayload(payloadB64, requireSecret());
  return `${payloadB64}.${sig}`;
}

export function mintConfirmToken(email: string, subscriberId: string): string {
  return mintToken('confirm', email, subscriberId, CONFIRM_TTL_SEC);
}

export function mintUnsubscribeToken(email: string, subscriberId: string): string {
  return mintToken('unsubscribe', email, subscriberId, UNSUB_TTL_SEC);
}

export interface VerifiedToken {
  readonly email: string;
  readonly subscriberId: string;
  readonly kind: TokenKind;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export function verifyToken(token: string, expectedKind: TokenKind): VerifiedToken | null {
  if (typeof token !== 'string' || token.length === 0) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return null;

  const expectedSig = signPayload(payloadB64, requireSecret());
  // timing-safe compare.
  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  let payload: TokenPayload;
  try {
    const raw = base64urlDecode(payloadB64).toString('utf8');
    payload = JSON.parse(raw) as TokenPayload;
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload.k !== 'string' ||
    typeof payload.e !== 'string' ||
    typeof payload.s !== 'string' ||
    typeof payload.i !== 'number' ||
    typeof payload.x !== 'number'
  ) {
    return null;
  }

  if (payload.k !== expectedKind) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.x <= now) return null; // expired

  return {
    email: payload.e,
    subscriberId: payload.s,
    kind: payload.k,
    issuedAt: payload.i,
    expiresAt: payload.x,
  };
}

export function hashTokenForDb(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
