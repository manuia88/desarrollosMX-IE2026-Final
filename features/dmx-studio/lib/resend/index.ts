// FASE 14.F.1 — DMX Studio dentro DMX único entorno (ADR-054).
// Studio email facade. Reusa el canon EmailProvider declarado en
// features/newsletter/lib/email-provider.ts (Mock default + Resend STUB).
//
// STUB ADR-018 — ResendEmailProvider activable L-NEW-RESEND-INSTALL: la
// instalacion del SDK `resend` espera approval founder. Hasta entonces, en
// dev/CI/test → MockEmailProvider. Si EMAIL_PROVIDER=resend en runtime → throw
// NOT_IMPLEMENTED.

import { type EmailSendInput, type EmailSendResult, getStudioEmailProvider } from './provider';
import {
  DRIP_DAY_3_SUBJECT,
  type RenderDripDay3Input,
  renderDripDay3Html,
} from './templates/drip-day-3';
import {
  DRIP_DAY_7_SUBJECT,
  type RenderDripDay7Input,
  renderDripDay7Html,
} from './templates/drip-day-7';
import {
  type RenderDripDay14Input,
  renderDripDay14Html,
  renderDripDay14Subject,
} from './templates/drip-day-14';
import {
  type RenderWelcomeStudioInput,
  renderWelcomeStudioHtml,
  WELCOME_STUDIO_SUBJECT,
} from './templates/welcome-studio';

const STUDIO_EMAIL_TAGS = [{ name: 'product', value: 'dmx-studio' }] as const;

interface SendArgs {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly tagValue: string;
}

async function sendStudioEmail(args: SendArgs): Promise<EmailSendResult> {
  const provider = getStudioEmailProvider();
  const input: EmailSendInput = {
    to: args.to,
    subject: args.subject,
    html: args.html,
    tags: [...STUDIO_EMAIL_TAGS, { name: 'studio_template', value: args.tagValue }],
  };
  return provider.send(input);
}

export interface SendWelcomeArgs extends RenderWelcomeStudioInput {
  readonly to: string;
}

export async function sendWelcomeEmail(args: SendWelcomeArgs): Promise<EmailSendResult> {
  const html = renderWelcomeStudioHtml({
    name: args.name,
    foundersCohortEligible: args.foundersCohortEligible,
    position: args.position ?? null,
  });
  return sendStudioEmail({
    to: args.to,
    subject: WELCOME_STUDIO_SUBJECT,
    html,
    tagValue: 'welcome',
  });
}

export interface SendDripDay3Args extends RenderDripDay3Input {
  readonly to: string;
}

export async function sendDripDay3(args: SendDripDay3Args): Promise<EmailSendResult> {
  const html = renderDripDay3Html({ name: args.name });
  return sendStudioEmail({
    to: args.to,
    subject: DRIP_DAY_3_SUBJECT,
    html,
    tagValue: 'drip_day_3',
  });
}

export interface SendDripDay7Args extends RenderDripDay7Input {
  readonly to: string;
}

export async function sendDripDay7(args: SendDripDay7Args): Promise<EmailSendResult> {
  const html = renderDripDay7Html({ name: args.name });
  return sendStudioEmail({
    to: args.to,
    subject: DRIP_DAY_7_SUBJECT,
    html,
    tagValue: 'drip_day_7',
  });
}

export interface SendDripDay14Args extends RenderDripDay14Input {
  readonly to: string;
}

export async function sendDripDay14(args: SendDripDay14Args): Promise<EmailSendResult> {
  const html = renderDripDay14Html({
    name: args.name,
    position: args.position ?? null,
    foundersRemaining: args.foundersRemaining ?? null,
  });
  return sendStudioEmail({
    to: args.to,
    subject: renderDripDay14Subject(args.foundersRemaining ?? null),
    html,
    tagValue: 'drip_day_14',
  });
}
