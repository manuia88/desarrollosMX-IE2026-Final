// Shared contracts for the Newsletter feature (BLOQUE 11.J).
//
// Newsletter mensual (día 5 09:00 CDMX) + DMX Wrapped anual (1 enero) +
// Migration Wrapped + Strava Segments streaks + secciones cross-function con
// Causal Engine (11.E) + Pulse (11.F) + Migration Flow (11.G) + Scorecard
// Nacional (11.I).
//
// Email provider: Resend (no instalado aún — adapter con mock default + blocker
// L-NN-RESEND-INSTALL → espera founder approval). Templates en TSX functional
// components (renderToStaticMarkup) — NO MJML (evita dependencia nueva).
//
// Persiste en:
//   - public.newsletter_subscribers (email, consent, double opt-in tokens, prefs)
//   - public.newsletter_deliveries (audit log envíos + events Resend webhooks)
//   - public.zone_streaks (Strava Segments streaks por zona)
//   - public.newsletter_ab_tests (A/B subject lines 50/50)
//   - public.dmx_wrapped_snapshots (snapshot anual personalizado por user)

// ---------------- Enums + primitives ----------------

export type NewsletterLocale = 'es-MX' | 'es-CO' | 'es-AR' | 'pt-BR' | 'en-US';

export type NewsletterFrequency = 'monthly' | 'quarterly' | 'annual';

export type NewsletterSubscriberStatus =
  | 'pending_confirmation'
  | 'active'
  | 'unsubscribed'
  | 'bounced'
  | 'complained';

export type NewsletterDeliveryStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'failed';

export type NewsletterTemplate =
  | 'monthly-mom'
  | 'scorecard-digest-preview'
  | 'scorecard-digest-post'
  | 'wrapped-annual'
  | 'confirm-email'
  | 'unsubscribe-confirm'
  | 'zone-personalized';

// ---------------- Rows ----------------

export interface NewsletterSubscriberRow {
  readonly id: string;
  readonly email: string;
  readonly user_id: string | null;
  readonly locale: NewsletterLocale;
  readonly status: NewsletterSubscriberStatus;
  readonly subscribed_at: string;
  readonly confirmed_at: string | null;
  readonly unsubscribed_at: string | null;
  readonly confirm_token_hash: string | null;
  readonly unsubscribe_token_hash: string | null;
  readonly preferences: NewsletterPreferences;
  readonly consent_lfpdppp_at: string | null;
  readonly consent_ip: string | null;
  readonly tags: readonly string[];
}

export interface NewsletterPreferences {
  readonly frequency: NewsletterFrequency;
  readonly zone_scope_ids: readonly string[];
  readonly sections: {
    readonly pulse: boolean;
    readonly migration: boolean;
    readonly causal: boolean;
    readonly alpha: boolean;
    readonly scorecard: boolean;
    readonly streaks: boolean;
  };
}

export interface NewsletterDeliveryRow {
  readonly id: string;
  readonly subscriber_id: string;
  readonly template: NewsletterTemplate;
  readonly subject: string;
  readonly subject_variant: string | null;
  readonly ab_test_id: string | null;
  readonly sent_at: string;
  readonly status: NewsletterDeliveryStatus;
  readonly provider_message_id: string | null;
  readonly opened_at: string | null;
  readonly clicked_at: string | null;
  readonly bounced_reason: string | null;
  readonly payload_summary: Record<string, unknown>;
}

export interface ZoneStreakRow {
  readonly id: string;
  readonly country_code: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly period_date: string;
  readonly streak_length_months: number;
  readonly current_pulse: number;
  readonly rank_in_country: number;
  readonly computed_at: string;
}

export interface NewsletterAbTestRow {
  readonly id: string;
  readonly template: NewsletterTemplate;
  readonly period_date: string;
  readonly variant_a_subject: string;
  readonly variant_b_subject: string;
  readonly sample_size: number;
  readonly winner_variant: 'A' | 'B' | null;
  readonly variant_a_open_rate: number | null;
  readonly variant_b_open_rate: number | null;
  readonly computed_at: string | null;
}

export interface DmxWrappedSnapshotRow {
  readonly id: string;
  readonly user_id: string | null;
  readonly year: number;
  readonly country_code: string;
  readonly cards: readonly WrappedCard[];
  readonly share_url: string | null;
  readonly generated_at: string;
}

export interface WrappedCard {
  readonly kind: WrappedCardKind;
  readonly title: string;
  readonly value: string;
  readonly subtext: string | null;
  readonly emoji: string | null;
  readonly share_png_url: string | null;
}

export type WrappedCardKind =
  | 'top_zone_explored'
  | 'zone_visited_count'
  | 'top_pulse_zone'
  | 'top_migration_origin'
  | 'top_migration_destination'
  | 'top_alpha_zone'
  | 'index_watched_most'
  | 'streak_personal_best'
  | 'national_pulse'
  | 'national_top_migration'
  | 'scorecard_reports_read';

// ---------------- Bundles (cross-function) ----------------

export interface NewsletterMonthlyBundle {
  readonly period_date: string;
  readonly country_code: string;
  readonly locale: NewsletterLocale;
  readonly hero_top_five: readonly HeroTopEntry[];
  readonly causal_paragraphs: readonly string[];
  readonly pulse_section: PulseSectionBundle | null;
  readonly migration_section: MigrationSectionBundle | null;
  readonly streaks_section: StreaksSectionBundle | null;
  readonly cta: NewsletterCta;
}

export interface HeroTopEntry {
  readonly rank: number;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly zone_label: string;
  readonly value: number;
  readonly delta_pct: number | null;
}

export interface PulseSectionBundle {
  readonly scope_id: string;
  readonly zone_label: string;
  readonly current_pulse: number;
  readonly delta_4w: number | null;
  readonly sparkline_svg: string;
  readonly detail_url: string;
}

export interface MigrationSectionBundle {
  readonly scope_id: string;
  readonly zone_label: string;
  readonly top_origins: readonly MigrationFlowEntry[];
  readonly top_destinations: readonly MigrationFlowEntry[];
  readonly detail_url: string;
}

export interface MigrationFlowEntry {
  readonly scope_id: string;
  readonly zone_label: string;
  readonly volume: number;
  readonly share_pct: number;
}

export interface StreaksSectionBundle {
  readonly period_date: string;
  readonly top_streaks: readonly ZoneStreakRow[];
  readonly detail_url: string;
}

export interface NewsletterCta {
  readonly label: string;
  readonly url: string;
}

// ---------------- Email provider adapter ----------------

export interface EmailSendInput {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text?: string;
  readonly tags?: readonly { readonly name: string; readonly value: string }[];
  readonly replyTo?: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export interface EmailSendResult {
  readonly providerMessageId: string | null;
  readonly provider: 'resend' | 'mock';
  readonly accepted: boolean;
  readonly error: string | null;
}

// ---------------- Scorecard digest + Wrapped bundles ----------------

export interface ScorecardDigestBundle {
  readonly report_id: string;
  readonly period_type: 'quarterly';
  readonly period_date: string;
  readonly preview_paragraph: string;
  readonly headline: string;
  readonly release_date: string;
  readonly cta_url: string;
}

export interface MigrationWrappedBundle {
  readonly year: number;
  readonly country_code: string;
  readonly top_magnet: {
    readonly scope_id: string;
    readonly zone_label: string;
    readonly net: number;
  };
  readonly top_exodus: {
    readonly scope_id: string;
    readonly zone_label: string;
    readonly net: number;
  };
  readonly total_flows: number;
  readonly cards: readonly WrappedCard[];
}
