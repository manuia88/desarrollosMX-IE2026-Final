import { NextResponse } from 'next/server';
import { inmuebles24Adapter } from '@/features/marketing/lib/portals/inmuebles24';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';

const PORTAL_SLUG = 'listing_inbound';

export async function POST(request: Request): Promise<Response> {
  try {
    const expectedSecret = process.env.PORTAL_WEBHOOK_INMUEBLES24_SECRET ?? '';
    const auth = request.headers.get('authorization') ?? '';
    if (expectedSecret && auth !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as unknown;
    const lead = inmuebles24Adapter.parseLeadWebhook(payload);

    if (!lead.contactName || (!lead.phone && !lead.email)) {
      return NextResponse.json({ error: 'lead missing required fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let projectId: string | null = null;
    let zoneId: string | null = null;
    let countryCode = 'MX';
    if (lead.projectId) {
      const { data: pub } = await supabase
        .from('marketing_publications')
        .select('project_id')
        .eq('portal', 'inmuebles24')
        .eq('external_id', lead.projectId)
        .maybeSingle();
      projectId = pub?.project_id ?? null;
      if (projectId) {
        const { data: project } = await supabase
          .from('proyectos')
          .select('zone_id, country_code')
          .eq('id', projectId)
          .maybeSingle();
        zoneId =
          (project as { zone_id?: string | null; country_code?: string | null } | null)?.zone_id ??
          null;
        countryCode = (project as { country_code?: string | null } | null)?.country_code ?? 'MX';
      }
    }

    if (!zoneId) {
      sentry.captureException(
        new Error('inmuebles24-webhook: cannot resolve zone for incoming lead'),
        {
          tags: { feature: 'portal-webhook', portal: 'inmuebles24' },
          extra: { lead: JSON.stringify(lead), payload: JSON.stringify(payload) },
        },
      );
      return NextResponse.json({ error: 'cannot resolve zone for project' }, { status: 422 });
    }

    const { data: source } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('slug', PORTAL_SLUG)
      .maybeSingle();
    if (!source) {
      return NextResponse.json({ error: 'lead_source missing' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        contact_name: lead.contactName,
        contact_phone: lead.phone ?? null,
        contact_email: lead.email ?? null,
        country_code: countryCode,
        zone_id: zoneId,
        source_id: source.id,
        notes: lead.message ?? null,
        metadata: { portal: 'inmuebles24', external_id: lead.projectId ?? null },
      })
      .select('id')
      .single();

    if (error) {
      sentry.captureException(error, {
        tags: { feature: 'portal-webhook', portal: 'inmuebles24' },
      });
      return NextResponse.json({ error: 'lead insert failed' }, { status: 500 });
    }

    return NextResponse.json({ leadId: data.id }, { status: 201 });
  } catch (err) {
    sentry.captureException(err, { tags: { feature: 'portal-webhook', portal: 'inmuebles24' } });
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
