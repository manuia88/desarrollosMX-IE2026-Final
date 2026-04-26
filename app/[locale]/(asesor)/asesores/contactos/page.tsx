import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { ContactosPage, filtersSchema, loadContactos } from '@/features/asesor-contactos';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AsesorContactosRoute({ params, searchParams }: RouteProps) {
  const { locale } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/contactos`);
  }

  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') flat[k] = v;
    else if (Array.isArray(v) && typeof v[0] === 'string') flat[k] = v[0];
  }
  const parsed = filtersSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : filtersSchema.parse({});

  const initialData = await loadContactos(filters, user.id);

  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 24,
            color: 'var(--canon-cream-2)',
            fontSize: 13,
          }}
        >
          {/* Skeleton minimo canon: la grid renderiza placeholder dentro de ContactosPage */}
        </div>
      }
    >
      <ContactosPage initialData={initialData} />
    </Suspense>
  );
}
