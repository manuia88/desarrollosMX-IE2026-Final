import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import {
  CaptacionesPage,
  CaptacionesSkeleton,
  filtersSchema,
  loadCaptacionDetail,
  loadCaptaciones,
} from '@/features/asesor-captaciones';
import { createClient } from '@/shared/lib/supabase/server';

interface RouteProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AsesorCaptacionesRoute({ params, searchParams }: RouteProps) {
  const { locale } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/asesores/captaciones`);
  }

  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === 'string') flat[k] = v;
    else if (Array.isArray(v) && typeof v[0] === 'string') flat[k] = v[0];
  }
  const parsed = filtersSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : filtersSchema.parse({});

  const initialData = await loadCaptaciones(filters, user.id);
  const detail = filters.drawer ? await loadCaptacionDetail(filters.drawer, user.id) : null;

  return (
    <Suspense fallback={<CaptacionesSkeleton />}>
      <CaptacionesPage initialData={initialData} detail={detail} />
    </Suspense>
  );
}
