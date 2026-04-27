// FASE 14.F.2 — DMX Studio dentro DMX único entorno (ADR-054).
// Email provider local para Studio (mirror del canon en features/newsletter/lib/email-provider.ts).
// Inline para evitar cross-feature import (Regla #5 CLAUDE.md). Pattern: MockEmailProvider
// (default CI/dev/test) + ResendEmailProvider (Resend SDK v6 real, requires RESEND_API_KEY).

import { Resend } from 'resend';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface EmailSendInput {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly tags?: ReadonlyArray<{ name: string; value: string }>;
}

export interface EmailSendResult {
  readonly providerMessageId: string | null;
  readonly provider: 'mock' | 'resend';
  readonly accepted: boolean;
  readonly error: string | null;
}

export interface EmailProvider {
  readonly name: 'mock' | 'resend';
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

function randomMockId(): string {
  try {
    return `mock-${crypto.randomUUID()}`;
  } catch {
    const rand = Math.random().toString(36).slice(2, 10);
    const now = Date.now().toString(36);
    return `mock-${now}-${rand}`;
  }
}

export class StudioMockEmailProvider implements EmailProvider {
  readonly name = 'mock' as const;
  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[StudioMockEmailProvider.send]', {
        to: input.to,
        subject: input.subject,
        bytes: input.html.length,
      });
    }
    return {
      providerMessageId: randomMockId(),
      provider: 'mock',
      accepted: true,
      error: null,
    };
  }
}

const STUDIO_FROM_DEFAULT = 'DMX Studio <studio@desarrollosmx.com>';

export class StudioResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;
  private readonly client: Resend;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress?: string) {
    this.client = new Resend(apiKey);
    this.fromAddress = fromAddress ?? process.env.RESEND_FROM_ADDRESS ?? STUDIO_FROM_DEFAULT;
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    try {
      const result = await this.client.emails.send({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.tags ? { tags: input.tags.map((t) => ({ name: t.name, value: t.value })) } : {}),
      });
      if (result.error) {
        sentry.captureException(new Error(result.error.message), {
          tags: { feature: 'dmx-studio.resend', op: 'send' },
          extra: { to: input.to, subject: input.subject },
        });
        return {
          providerMessageId: null,
          provider: 'resend',
          accepted: false,
          error: result.error.message,
        };
      }
      return {
        providerMessageId: result.data?.id ?? null,
        provider: 'resend',
        accepted: true,
        error: null,
      };
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.resend', op: 'send.exception' },
        extra: { to: input.to, subject: input.subject },
      });
      const message = err instanceof Error ? err.message : 'unknown_error';
      return {
        providerMessageId: null,
        provider: 'resend',
        accepted: false,
        error: message,
      };
    }
  }
}

type ProviderChoice = 'mock' | 'resend';

function resolveChoice(): ProviderChoice {
  if (process.env.CI === 'true' || process.env.CI === '1') return 'mock';
  const raw = process.env.EMAIL_PROVIDER?.toLowerCase().trim();
  if (raw === 'resend' && process.env.RESEND_API_KEY) return 'resend';
  return 'mock';
}

let cachedProvider: EmailProvider | null = null;

export function getStudioEmailProvider(): EmailProvider {
  if (cachedProvider !== null) return cachedProvider;
  const choice = resolveChoice();
  if (choice === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      cachedProvider = new StudioMockEmailProvider();
    } else {
      cachedProvider = new StudioResendEmailProvider(apiKey);
    }
  } else {
    cachedProvider = new StudioMockEmailProvider();
  }
  return cachedProvider;
}

export function __resetStudioEmailProviderForTests(): void {
  cachedProvider = null;
}
