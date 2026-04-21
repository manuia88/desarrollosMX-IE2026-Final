// FASE 11.J — Email provider adapter.
//
// Abstrae el envío de email detrás de una interface `EmailProvider`. Dos
// implementaciones:
//
//  - MockEmailProvider   : default en dev/tests. Loggea a console + devuelve
//                          message id sintético. Nunca hace I/O de red.
//  - ResendEmailProvider : placeholder. Requiere `npm i resend` (no instalado
//                          aún por regla inviolable founder: zero deps sin
//                          approval). `send()` throws NOT_IMPLEMENTED con
//                          pointer L-NN-RESEND-INSTALL.
//
// Factory `getEmailProvider()` elige entre mock|resend según
// `process.env.EMAIL_PROVIDER`. En CI (`process.env.CI === 'true'`) siempre
// fuerza mock — nunca enviamos email real desde pipelines.
//
// Cuando founder apruebe instalación (L-NN-RESEND-INSTALL), el único cambio
// necesario es reemplazar el body de `ResendEmailProvider.send()` por la
// llamada al SDK real. La interface pública queda idéntica.

import type { EmailSendInput, EmailSendResult } from '../types';

export interface EmailProvider {
  readonly name: 'mock' | 'resend';
  send(input: EmailSendInput): Promise<EmailSendResult>;
}

// ---------------- Mock ----------------

function randomMockId(): string {
  // UUID v4 best-effort via crypto.randomUUID (Node 19+, runtime edge/node).
  try {
    return `mock-${crypto.randomUUID()}`;
  } catch {
    // Fallback determinista si el runtime no expone randomUUID.
    const rand = Math.random().toString(36).slice(2, 10);
    const now = Date.now().toString(36);
    return `mock-${now}-${rand}`;
  }
}

export class MockEmailProvider implements EmailProvider {
  readonly name = 'mock' as const;

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    // Log ligero (en CI/tests simplemente queda disponible si se quiere inspeccionar).
    if (process.env.NODE_ENV !== 'test') {
      console.info('[MockEmailProvider.send]', {
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

// ---------------- Resend placeholder ----------------

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend' as const;

  async send(_input: EmailSendInput): Promise<EmailSendResult> {
    // L-NN-RESEND-INSTALL — espera founder approval para `npm i resend`.
    // Una vez instalado reemplazar por:
    //   const { Resend } = await import('resend');
    //   const client = new Resend(process.env.RESEND_API_KEY);
    //   const { data, error } = await client.emails.send({ ... });
    //   return { providerMessageId: data?.id ?? null, provider: 'resend', accepted: !error, error: error?.message ?? null };
    throw new Error(
      'NOT_IMPLEMENTED: ResendEmailProvider requires `resend` package. ' +
        'Pointer L-NN-RESEND-INSTALL → awaiting founder approval for `npm i resend`. ' +
        'Set EMAIL_PROVIDER=mock or omit to continue using MockEmailProvider.',
    );
  }
}

// ---------------- Factory ----------------

type ProviderChoice = 'mock' | 'resend';

function resolveChoice(): ProviderChoice {
  // En CI siempre mock — no enviamos correos reales desde pipelines.
  if (process.env.CI === 'true' || process.env.CI === '1') return 'mock';
  const raw = process.env.EMAIL_PROVIDER?.toLowerCase().trim();
  if (raw === 'resend') return 'resend';
  return 'mock';
}

// Cache singleton por proceso (idéntico a patrón createAdminClient).
let cachedProvider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (cachedProvider !== null) return cachedProvider;
  const choice = resolveChoice();
  cachedProvider = choice === 'resend' ? new ResendEmailProvider() : new MockEmailProvider();
  return cachedProvider;
}

export function __resetEmailProviderForTests(): void {
  cachedProvider = null;
}
