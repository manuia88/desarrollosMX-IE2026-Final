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
  CHALLENGE_WEEK_LAUNCHED_SUBJECT,
  type RenderChallengeWeekLaunchedInput,
  renderChallengeWeekLaunchedHtml,
} from './templates/challenge-week-launched';
import {
  DAILY_CONTENT_READY_SUBJECT,
  type RenderDailyContentReadyInput,
  renderDailyContentReadyHtml,
} from './templates/daily-content-ready';
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
  NEW_REMARKETING_GENERATED_SUBJECT,
  type RenderNewRemarketingGeneratedInput,
  renderNewRemarketingGeneratedHtml,
} from './templates/new-remarketing-generated';
import {
  type RenderStreakMilestoneInput,
  renderStreakMilestoneHtml,
  renderStreakMilestoneSubject,
} from './templates/streak-milestone';
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

// ---------------------------------------------------------------------------
// F14.F.5 Sprint 4 — Sprint 4 templates (calendar, remarketing, streaks,
// challenges).
// ---------------------------------------------------------------------------

export interface SendDailyContentReadyArgs extends RenderDailyContentReadyInput {
  readonly to: string;
}

export async function sendDailyContentReady(
  args: SendDailyContentReadyArgs,
): Promise<EmailSendResult> {
  const html = renderDailyContentReadyHtml({
    name: args.name ?? null,
    calendarEntryType: args.calendarEntryType,
    calendarEntryTitle: args.calendarEntryTitle,
    calendarEntryUrl: args.calendarEntryUrl,
  });
  return sendStudioEmail({
    to: args.to,
    subject: DAILY_CONTENT_READY_SUBJECT,
    html,
    tagValue: 'daily_content_ready',
  });
}

export interface SendNewRemarketingGeneratedArgs extends RenderNewRemarketingGeneratedInput {
  readonly to: string;
}

export async function sendNewRemarketingGenerated(
  args: SendNewRemarketingGeneratedArgs,
): Promise<EmailSendResult> {
  const html = renderNewRemarketingGeneratedHtml({
    name: args.name ?? null,
    sourceProjectTitle: args.sourceProjectTitle,
    newProjectUrl: args.newProjectUrl,
    angle: args.angle,
  });
  return sendStudioEmail({
    to: args.to,
    subject: NEW_REMARKETING_GENERATED_SUBJECT,
    html,
    tagValue: 'new_remarketing_generated',
  });
}

export interface SendStreakMilestoneArgs extends RenderStreakMilestoneInput {
  readonly to: string;
}

export async function sendStreakMilestone(args: SendStreakMilestoneArgs): Promise<EmailSendResult> {
  const html = renderStreakMilestoneHtml({
    name: args.name ?? null,
    badgeKey: args.badgeKey,
    currentStreakDays: args.currentStreakDays,
  });
  return sendStudioEmail({
    to: args.to,
    subject: renderStreakMilestoneSubject(args.badgeKey),
    html,
    tagValue: 'streak_milestone',
  });
}

export interface SendChallengeWeekLaunchedArgs extends RenderChallengeWeekLaunchedInput {
  readonly to: string;
}

export async function sendChallengeWeekLaunched(
  args: SendChallengeWeekLaunchedArgs,
): Promise<EmailSendResult> {
  const html = renderChallengeWeekLaunchedHtml({
    name: args.name ?? null,
    challengeTitle: args.challengeTitle,
    challengeDescription: args.challengeDescription,
    weekStart: args.weekStart,
    rewardXp: args.rewardXp,
  });
  return sendStudioEmail({
    to: args.to,
    subject: CHALLENGE_WEEK_LAUNCHED_SUBJECT,
    html,
    tagValue: 'challenge_week_launched',
  });
}
