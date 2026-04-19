import { redirect } from 'next/navigation';
import { AdminIngestUploadForm } from '@/features/ingest-admin/components/upload-form';
import { createClient } from '@/shared/lib/supabase/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const ADMIN_ROLES = new Set(['superadmin', 'mb_admin']);

export default async function AdminIngestUploadPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/admin/ingest/upload`);
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
        <h1 className="text-2xl font-semibold">Admin Ingest Upload</h1>
        <p className="text-muted-foreground">
          Sube reportes oficiales (XLSX/CSV/PDF) de SHF, BBVA Research, CNBV, Infonavit y FOVISSSTE.
          Cada upload se persiste en bucket privado <code>ingest-uploads</code>y dispara el ingestor
          correspondiente con audit en <code>ingest_runs</code>.
        </p>
      </header>
      <AdminIngestUploadForm />
    </main>
  );
}
