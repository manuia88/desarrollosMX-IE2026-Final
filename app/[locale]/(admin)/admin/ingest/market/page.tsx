import { redirect } from 'next/navigation';
import { MarketIngestUploadForm } from '@/features/ingest-admin/components/market-upload-form';
import { createClient } from '@/shared/lib/supabase/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const ADMIN_ROLES = new Set(['superadmin', 'mb_admin']);

export default async function AdminIngestMarketPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/admin/ingest/market`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ADMIN_ROLES.has(profile.rol)) {
    redirect(`/${locale}/`);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Admin Ingest — Market Reports (GC-7)</h1>
        <p className="text-muted-foreground">
          Sube reports trimestrales PDF de <strong>Cushman</strong>, <strong>CBRE</strong>,
          <strong> Tinsa</strong>, <strong>JLL</strong> o <strong>Softec</strong>. Extracción con
          GPT-4o-mini bajo Constitutional AI (GC-7): cada métrica requiere <code>source_span</code>{' '}
          literal del PDF y se flaggea <code>review_required=true</code> si confidence &lt; 0.8.
        </p>
        <p className="text-xs text-muted-foreground">
          Destino: tabla <code>market_pulse</code> con <code>zone_id=NULL</code> (nivel nacional).
          Enriquecimiento por zona: FASE 08+.
        </p>
      </header>
      <MarketIngestUploadForm />
    </main>
  );
}
