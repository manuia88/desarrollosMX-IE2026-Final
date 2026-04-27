import { notFound } from 'next/navigation';
import { createAdminClient } from '@/shared/lib/supabase/admin';

interface RouteProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: folder } = await supabase
    .from('client_folders')
    .select('title, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  if (!folder) return { title: 'Radar' };
  return {
    title: folder.title,
    description: folder.description ?? 'Radar compartido — DMX',
  };
}

export default async function RadarPublicPage({ params }: RouteProps) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const { data: folder } = await supabase
    .from('client_folders')
    .select('id, title, description, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!folder) {
    notFound();
  }

  const { data: links } = await supabase
    .from('folder_projects')
    .select('project_id, sort_order')
    .eq('folder_id', folder.id)
    .order('sort_order', { ascending: true });

  const projectIds = (links ?? []).map((l) => l.project_id);

  const { data: projects } = await supabase
    .from('proyectos')
    .select('id, nombre, description, ciudad, colonia, cover_photo_url')
    .in('id', projectIds.length > 0 ? projectIds : ['00000000-0000-0000-0000-000000000000']);

  return (
    <main className="min-h-screen px-4 py-10 md:px-8" style={{ background: 'var(--canon-bg)' }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1
            className="text-3xl font-extrabold text-[var(--canon-white-pure)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {folder.title}
          </h1>
          {folder.description ? (
            <p className="text-sm text-[color:rgba(255,255,255,0.70)]">{folder.description}</p>
          ) : null}
        </header>

        {!projects || projects.length === 0 ? (
          <p className="text-sm text-[color:rgba(255,255,255,0.65)]">
            Este Radar aún no tiene proyectos asociados.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                {project.description ? (
                  <p className="text-sm text-[color:rgba(255,255,255,0.80)] line-clamp-3">
                    {project.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
