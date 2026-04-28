'use client';

// F14.F.9 Sprint 8 BIBLIA Tarea 8.3 — Series detail page con timeline + actions.
// F14.F.11 Sprint 10 BIBLIA Tarea 10.5 fix P1.2 — Loading skeleton canon en lugar
// de literal "Cargando..." (consistencia con LibraryPage / CalendarPage / Dashboard).
import { useRouter } from 'next/navigation';
import { type CSSProperties, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { AutoProgressToggle } from './AutoProgressToggle';
import type { EpisodeStatus } from './EpisodeStatusBadge';
import { SeriesTimelineExpansible } from './SeriesTimelineExpansible';

export interface SeriesDetailPageProps {
  readonly seriesId: string;
  readonly locale: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 32,
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: 14,
  marginTop: 4,
};

const sectionStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 20,
  marginTop: 24,
};

const ctaStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 9999,
  padding: '10px 20px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
};

const ghostStyle: CSSProperties = {
  ...ctaStyle,
  background: 'transparent',
  border: '1px solid var(--canon-border)',
  color: 'var(--canon-cream)',
};

const skeletonHeroStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: 32,
  width: '60%',
  marginTop: 8,
};

const skeletonLineStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: 14,
  width: '40%',
  marginTop: 12,
};

const skeletonBlockStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: 220,
  marginTop: 24,
};

export function SeriesDetailPage({ seriesId, locale }: SeriesDetailPageProps) {
  const router = useRouter();
  const series = trpc.studio.sprint8Series.getById.useQuery({ seriesId });
  const episodes = trpc.studio.sprint8Series.listEpisodes.useQuery({ seriesId });
  const recommendation = trpc.studio.sprint8Series.suggestNextEpisode.useQuery({ seriesId });
  const utils = trpc.useUtils();
  const titleCardMutation = trpc.studio.sprint8Series.generateTitleCard.useMutation();
  const visualRefsMutation = trpc.studio.sprint8Series.buildVisualRefs.useMutation();
  const [publicSlug, setPublicSlug] = useState('');
  const publishMutation = trpc.studio.sprint8Series.publishPublicly.useMutation();

  if (series.isLoading) {
    return (
      <section
        role="status"
        aria-busy="true"
        aria-label="Cargando serie"
        data-testid="series-detail-loading"
      >
        <div aria-hidden="true" style={skeletonHeroStyle} />
        <div aria-hidden="true" style={skeletonLineStyle} />
        <div aria-hidden="true" style={skeletonBlockStyle} />
      </section>
    );
  }
  if (!series.data) {
    return <div style={{ color: 'var(--canon-cream-2)' }}>Serie no encontrada</div>;
  }

  const eps = (episodes.data?.episodes ?? []).map((e) => ({
    id: e.id,
    episodeNumber: e.episode_number,
    title: e.title,
    status: e.status as EpisodeStatus,
    narrativePhase: e.narrative_phase,
    titleCardStoragePath: e.title_card_storage_path,
  }));

  const handleSelectEpisode = async (episodeId: string) => {
    try {
      await titleCardMutation.mutateAsync({ episodeId });
      utils.studio.sprint8Series.listEpisodes.invalidate({ seriesId });
    } catch {
      /* sentry handled */
    }
  };

  const handleBuildRefs = async () => {
    try {
      await visualRefsMutation.mutateAsync({ seriesId });
      utils.studio.sprint8Series.getById.invalidate({ seriesId });
    } catch {
      /* sentry handled */
    }
  };

  const handlePublish = async () => {
    if (!publicSlug.trim()) return;
    try {
      await publishMutation.mutateAsync({ seriesId, publicSlug: publicSlug.trim() });
      utils.studio.sprint8Series.getById.invalidate({ seriesId });
    } catch {
      /* sentry handled */
    }
  };

  const desarrolloAssociated = Boolean(series.data.desarrollo_id);

  return (
    <section aria-label={`Serie ${series.data.title}`}>
      <button
        type="button"
        onClick={() => router.push(`/${locale}/studio-app/series`)}
        style={{ ...ghostStyle, marginBottom: 16 }}
      >
        ← Volver
      </button>
      <h1 style={headingStyle}>{series.data.title}</h1>
      <p style={subtitleStyle}>
        {series.data.episodes_count} episodios ·{' '}
        {series.data.is_published_publicly ? 'Pública' : 'Privada'}
        {series.data.auto_progress_enabled ? ' · auto-trigger ON' : ''}
      </p>

      <div style={sectionStyle}>
        <h2 style={{ ...headingStyle, fontSize: 22 }}>Línea de tiempo</h2>
        <p style={subtitleStyle}>Click en un episodio para generar su title card animada.</p>
        <div style={{ marginTop: 16 }}>
          <SeriesTimelineExpansible episodes={eps} onSelectEpisode={handleSelectEpisode} />
        </div>
      </div>

      {recommendation.data ? (
        <div style={sectionStyle}>
          <h2 style={{ ...headingStyle, fontSize: 22 }}>Sugerencia narrativa</h2>
          <p style={subtitleStyle}>{recommendation.data.reasoning}</p>
          {recommendation.data.urgencyLevel !== 'low' ? (
            <div
              style={{
                marginTop: 12,
                color:
                  recommendation.data.urgencyLevel === 'high' ? '#FBBF24' : 'var(--canon-cream-2)',
                fontSize: 13,
              }}
            >
              Urgencia: {recommendation.data.urgencyLevel}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={sectionStyle}>
        <h2 style={{ ...headingStyle, fontSize: 22 }}>Acciones</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" onClick={handleBuildRefs} style={ctaStyle}>
            Construir refs visuales
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <AutoProgressToggle
          seriesId={seriesId}
          hasDesarrolloAssociated={desarrolloAssociated}
          initialEnabled={series.data.auto_progress_enabled ?? false}
        />
      </div>

      <div style={sectionStyle}>
        <h2 style={{ ...headingStyle, fontSize: 22 }}>Publicar pública</h2>
        <p style={subtitleStyle}>
          Hace tu serie accesible en /studio/[asesor]/serie/[slug] binge-watch.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <input
            placeholder="slug-de-mi-serie"
            value={publicSlug}
            onChange={(e) => setPublicSlug(e.target.value.toLowerCase())}
            style={{
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 12,
              padding: '10px 16px',
              color: '#FFFFFF',
              flex: 1,
            }}
            aria-label="Slug pública"
          />
          <button type="button" onClick={handlePublish} style={ctaStyle} disabled={!publicSlug}>
            Publicar
          </button>
        </div>
        <div
          style={{ ...subtitleStyle, marginTop: 8, fontSize: 12, color: 'rgba(252,211,77,0.8)' }}
        >
          Disclosure ADR-018: feature shipped F14.F.9 con datos sintéticos hasta upload real.
        </div>
      </div>
    </section>
  );
}
