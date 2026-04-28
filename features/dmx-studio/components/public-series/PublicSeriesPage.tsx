'use client';

// F14.F.9 Sprint 8 BIBLIA LATERAL 7 — Public series page binge-watch.
// F14.F.11 Sprint 10 BIBLIA Tarea 10.5 fix P1.2 — Loading skeleton canon en lugar
// de literal "Cargando..." (consistencia con LibraryPage / CalendarPage / Dashboard).
import { type CSSProperties, useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { EpisodePlayerBinge } from './EpisodePlayerBinge';

export interface PublicSeriesPageProps {
  readonly asesorSlug: string;
  readonly serieSlug: string;
  readonly locale: string;
}

const heroStyle: CSSProperties = {
  background: 'linear-gradient(180deg, var(--surface-elevated), transparent)',
  padding: '64px 24px 32px',
  textAlign: 'center',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: 44,
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: 16,
  marginTop: 8,
};

export function PublicSeriesPage({ asesorSlug, serieSlug, locale }: PublicSeriesPageProps) {
  const seriesQuery = trpc.studio.sprint8PublicSeries.getBySlug.useQuery({ asesorSlug, serieSlug });
  const episodesQuery = trpc.studio.sprint8PublicSeries.listEpisodesPublic.useQuery({
    asesorSlug,
    serieSlug,
  });
  const recordView = trpc.studio.sprint8PublicSeries.recordView.useMutation();
  const [viewLogged, setViewLogged] = useState(false);

  useEffect(() => {
    if (!viewLogged && seriesQuery.data) {
      setViewLogged(true);
      recordView.mutate({ asesorSlug, serieSlug });
    }
  }, [viewLogged, seriesQuery.data, asesorSlug, serieSlug, recordView]);

  if (seriesQuery.isLoading) {
    return (
      <main
        role="status"
        aria-busy="true"
        aria-label="Cargando serie pública"
        data-testid="public-series-loading"
        style={{ minHeight: '100vh', background: 'var(--canon-bg)' }}
      >
        <section style={heroStyle}>
          <div
            aria-hidden="true"
            style={{
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-card)',
              height: 56,
              width: '60%',
              margin: '0 auto',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-card)',
              height: 16,
              width: '40%',
              margin: '16px auto 0',
            }}
          />
        </section>
        <section style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
          <div
            aria-hidden="true"
            style={{
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-card)',
              height: 360,
            }}
          />
        </section>
      </main>
    );
  }
  if (!seriesQuery.data) {
    return <div style={{ color: 'var(--canon-cream-2)', padding: 48 }}>Serie no encontrada</div>;
  }

  const series = seriesQuery.data.series;
  const asesor = seriesQuery.data.asesor;
  const episodes = episodesQuery.data?.episodes ?? [];

  return (
    <main aria-label="Serie pública" style={{ minHeight: '100vh', background: 'var(--canon-bg)' }}>
      <section style={heroStyle}>
        <h1 style={titleStyle}>{series.title}</h1>
        <p style={subtitleStyle}>
          Una serie documental de {asesor.title} · {series.episodes_count} capítulos
        </p>
        <div style={{ ...subtitleStyle, marginTop: 4, fontSize: 13 }}>
          Disclosure ADR-018: Datos sintéticos H1 hasta primer upload real del asesor.
        </div>
      </section>

      <section style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
        <EpisodePlayerBinge
          episodes={episodes.map((e) => ({
            id: e.id,
            episodeNumber: e.episode_number,
            title: e.title,
            description: e.description,
            narrativePhase: e.narrative_phase,
            titleCardStoragePath: e.title_card_storage_path,
          }))}
          onEpisodeChange={(episodeId) => recordView.mutate({ asesorSlug, serieSlug, episodeId })}
        />
      </section>

      <footer
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          color: 'var(--canon-cream-2)',
          fontSize: 13,
        }}
      >
        Producido con DMX Studio · {locale.toUpperCase()}
      </footer>
    </main>
  );
}
