// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Email provider local para Studio (mirror del canon en features/newsletter/lib/email-provider.ts).
// Inline para evitar cross-feature import (Regla #5 CLAUDE.md). Pattern idéntico
// al canon: MockEmailProvider default + ResendEmailProvider STUB ADR-018.
//
// STUB ADR-018 — ResendEmailProvider activable L-NEW-RESEND-INSTALL: instalación
// `npm i resend` espera approval founder. CI/dev/test → MockEmailProvider.

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

export class StudioResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;
  async send(_input: EmailSendInput): Promise<EmailSendResult> {
    throw new Error(
      'NOT_IMPLEMENTED: StudioResendEmailProvider requires `resend` package. ' +
        'Pointer L-NEW-RESEND-INSTALL → awaiting founder approval for `npm i resend`. ' +
        'Set EMAIL_PROVIDER=mock or omit to continue using StudioMockEmailProvider.',
    );
  }
}

type ProviderChoice = 'mock' | 'resend';

function resolveChoice(): ProviderChoice {
  if (process.env.CI === 'true' || process.env.CI === '1') return 'mock';
  const raw = process.env.EMAIL_PROVIDER?.toLowerCase().trim();
  if (raw === 'resend') return 'resend';
  return 'mock';
}

let cachedProvider: EmailProvider | null = null;

export function getStudioEmailProvider(): EmailProvider {
  if (cachedProvider !== null) return cachedProvider;
  const choice = resolveChoice();
  cachedProvider =
    choice === 'resend' ? new StudioResendEmailProvider() : new StudioMockEmailProvider();
  return cachedProvider;
}

export function __resetStudioEmailProviderForTests(): void {
  cachedProvider = null;
}
