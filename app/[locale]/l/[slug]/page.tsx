import { notFound } from 'next/navigation';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Json } from '@/shared/types/database';

interface RouteProps {
  params: Promise<{ locale: string; slug: string }>;
}

interface BrandColors {
  primary?: string;
  accent?: string;
}

interface LandingCopy {
  headline?: string;
  subheadline?: string;
  cta?: string;
}

interface SeoMeta {
  title?: string;
  description?: string;
}

function parseJson<T>(value: Json | null | undefined): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return value as T;
}

export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('landings')
    .select('seo_meta, copy')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  const seo = parseJson<SeoMeta>(data?.seo_meta);
  const copy = parseJson<LandingCopy>(data?.copy);
  return {
    title: seo?.title ?? copy?.headline ?? 'Landing — DMX',
    description: seo?.description ?? copy?.subheadline ?? '',
  };
}

export default async function LandingPublicPage({ params }: RouteProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: landing } = await supabase
    .from('landings')
    .select('id, slug, template, project_ids, brand_colors, copy')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (!landing) notFound();

  const brand = parseJson<BrandColors>(landing.brand_colors);
  const copy = parseJson<LandingCopy>(landing.copy);
  const primary = brand?.primary ?? '#6366F1';

  const { data: projects } = await supabase
    .from('proyectos')
    .select('id, nombre, description, ciudad, colonia, cover_photo_url')
    .in(
      'id',
      landing.project_ids.length > 0
        ? landing.project_ids
        : ['00000000-0000-0000-0000-000000000000'],
    );

  return (
    <main className="min-h-screen" style={{ background: 'var(--canon-bg)' }}>
      <section
        className="relative overflow-hidden px-4 py-20 md:px-8"
        style={{
          backgroundImage: `linear-gradient(135deg, ${primary}22 0%, transparent 60%)`,
        }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 text-center">
          <h1
            className="text-4xl font-extrabold text-[var(--canon-white-pure)] md:text-5xl"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {copy?.headline ?? landing.slug}
          </h1>
          {copy?.subheadline ? (
            <p className="text-lg text-[color:rgba(255,255,255,0.75)]">{copy.subheadline}</p>
          ) : null}
          {copy?.cta ? (
            <div className="mt-4 flex justify-center">
              <span
                className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg"
                style={{ background: primary }}
              >
                {copy.cta}
              </span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
        {!projects || projects.length === 0 ? (
          <p className="text-sm text-[color:rgba(255,255,255,0.65)]">
            Esta landing aún no tiene proyectos asociados.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="flex flex-col gap-3 rounded-2xl border border-[color:rgba(255,255,255,0.10)] bg-[color:rgba(255,255,255,0.04)] p-4"
              >
                {project.cover_photo_url ? (
                  // biome-ignore lint/performance/noImgElement: Supabase Storage external host; next/image domains config postpuesto a F14.D infra pass
                  <img
                    src={project.cover_photo_url}
                    alt={project.nombre ?? 'proyecto'}
                    className="h-48 w-full rounded-xl object-cover"
                  />
                ) : null}
                <h2
                  className="text-lg font-bold text-[var(--canon-white-pure)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {project.nombre}
                </h2>
                <p className="text-xs text-[color:rgba(255,255,255,0.65)]">
                  {[project.ciudad, project.colonia].filter(Boolean).join(' · ')}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
