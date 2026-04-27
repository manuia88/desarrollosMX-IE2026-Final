import { TRPCError } from '@trpc/server';
import { router } from '@/server/trpc/init';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import { studioProcedure } from './_studio-procedure';

interface StudioDashboardStats {
  readonly videosThisMonth: number;
  readonly videosLimit: number;
  readonly videosRemaining: number;
  readonly activeProjects: number;
  readonly avgFeedbackRating: number | null;
}

export const studioDashboardRouter = router({
  getStats: studioProcedure.query(async ({ ctx }): Promise<StudioDashboardStats> => {
    const supabase = createAdminClient();

    const { data: subscription, error: subError } = await supabase
      .from('studio_subscriptions')
      .select('videos_per_month_limit, videos_used_this_period, status')
      .eq('user_id', ctx.user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subError) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: subError });

    const videosLimit = subscription?.videos_per_month_limit ?? 0;
    const videosUsed = subscription?.videos_used_this_period ?? 0;

    const { data: rendered, error: rendErr } = await supabase
      .from('studio_video_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .in('status', ['rendered', 'published'])
      .gte('rendered_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    if (rendErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: rendErr });

    const { data: active, error: activeErr } = await supabase
      .from('studio_video_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .in('status', ['draft', 'scripting', 'rendering']);
    if (activeErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: activeErr });

    const { data: feedback, error: feedbackErr } = await supabase
      .from('studio_feedback')
      .select('rating')
      .eq('user_id', ctx.user.id)
      .not('rating', 'is', null);
    if (feedbackErr) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: feedbackErr });

    const ratings = (feedback ?? [])
      .map((f) => f.rating)
      .filter((r): r is number => typeof r === 'number');
    const avgFeedbackRating =
      ratings.length === 0
        ? null
        : Math.round((ratings.reduce((acc, r) => acc + r, 0) / ratings.length) * 10) / 10;

    return {
      videosThisMonth: rendered?.length ?? videosUsed,
      videosLimit,
      videosRemaining: Math.max(videosLimit - videosUsed, 0),
      activeProjects: active?.length ?? 0,
      avgFeedbackRating,
    };
  }),

  getRecentVideos: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_video_projects')
      .select('id, title, status, project_type, rendered_at, created_at, updated_at')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      projectType: row.project_type,
      renderedAt: row.rendered_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }),

  getCrossFunctionSuggestions: studioProcedure.query(async ({ ctx }) => {
    const supabase = createAdminClient();

    const { data: brokerProjects } = await supabase
      .from('project_brokers')
      .select('proyecto_id, proyectos(id, nombre, ciudad)')
      .eq('broker_user_id', ctx.user.id)
      .eq('active', true)
      .limit(6);

    const { data: captaciones } = await supabase
      .from('captaciones')
      .select('id, direccion, ciudad, precio_solicitado, status')
      .eq('asesor_id', ctx.user.id)
      .in('status', ['en_promocion', 'firmado', 'presentacion'])
      .order('updated_at', { ascending: false })
      .limit(8);

    return {
      developers: (brokerProjects ?? [])
        .filter((row): row is typeof row & { proyectos: NonNullable<typeof row.proyectos> } =>
          Boolean(row.proyectos),
        )
        .map((row) => ({
          proyectoId: row.proyecto_id,
          nombre: Array.isArray(row.proyectos) ? row.proyectos[0]?.nombre : row.proyectos?.nombre,
        })),
      captaciones: (captaciones ?? []).map((c) => ({
        id: c.id,
        direccion: c.direccion,
        ciudad: c.ciudad,
        precioSolicitado: c.precio_solicitado,
        status: c.status,
      })),
    };
  }),
});
