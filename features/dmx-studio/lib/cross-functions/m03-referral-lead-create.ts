// F14.F.8 Sprint 7 BIBLIA Upgrade 10 — Cross-function M03: referral form → lead M03.
// Vía pattern ADR-053 + ADR-055 (cross-feature shared module). Lead source canon: studio_gallery_referral.

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

export interface CreateLeadFromReferralInput {
  readonly submissionId: string;
  readonly asesorUserId: string;
  readonly submittedName: string;
  readonly submittedEmail: string;
  readonly submittedPhone: string | null;
  readonly submittedMessage: string | null;
}

export interface CreateLeadFromReferralResult {
  readonly leadId: string | null;
}

const REFERRAL_LEAD_SOURCE_SLUG = 'studio_gallery_referral';

export async function createLeadFromReferral(
  input: CreateLeadFromReferralInput,
): Promise<CreateLeadFromReferralResult> {
  const supabase = createAdminClient();

  const { data: asesor } = await supabase
    .from('profiles')
    .select('country_code, primary_zone_id')
    .eq('id', input.asesorUserId)
    .maybeSingle();

  const countryCode = ((asesor as { country_code?: string } | null)?.country_code ??
    'MX') as string;
  const primaryZoneId = (asesor as { primary_zone_id?: string } | null)?.primary_zone_id ?? null;

  if (!primaryZoneId) {
    sentry.captureException(
      new Error(`createLeadFromReferral: asesor ${input.asesorUserId} sin primary_zone_id`),
      { tags: { feature: 'dmx-studio.referral.lead-create' } },
    );
    return { leadId: null };
  }

  const { data: source } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('slug', REFERRAL_LEAD_SOURCE_SLUG)
    .maybeSingle();

  let sourceId = source?.id ?? null;
  if (!sourceId) {
    const { data: webSource } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('slug', 'web')
      .maybeSingle();
    sourceId = webSource?.id ?? null;
  }
  if (!sourceId) return { leadId: null };

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      zone_id: primaryZoneId,
      source_id: sourceId,
      country_code: countryCode,
      contact_name: input.submittedName,
      contact_email: input.submittedEmail,
      contact_phone: input.submittedPhone,
      assigned_asesor_id: input.asesorUserId,
      status: 'new',
    })
    .select('id')
    .single();
  if (error) {
    sentry.captureException(error, { tags: { feature: 'dmx-studio.referral.lead-create' } });
    return { leadId: null };
  }

  return { leadId: lead.id };
}
