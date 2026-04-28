'use client';

// F14.F.9 Sprint 8 BIBLIA Tarea 8.3 — Series list page.
// F14.F.11 Sprint 10 BIBLIA Tarea 10.5 fix P1.2 — Loading skeleton canon en lugar
// de literal "Cargando..." (consistencia con LibraryPage / CalendarPage / Dashboard).
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { EpisodeStatusBadge } from './EpisodeStatusBadge';

export interface SeriesListPageProps {
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

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16,
  marginTop: 24,
};

const cardStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  padding: 20,
  textDecoration: 'none',
  display: 'block',
  transition: 'transform 220ms ease, border-color 220ms ease',
};

const ctaStyle: CSSProperties = {
  background: 'linear-gradient(90deg, #6366F1, #EC4899)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 9999,
  padding: '12px 24px',
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
};

const skeletonCardStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '140px',
};

const SKELETON_KEYS = ['s1', 's2', 's3'] as const;

export function SeriesListPage({ locale }: SeriesListPageProps) {
  const list = trpc.studio.sprint8Series.list.useQuery();

  return (
    <section aria-label="Series">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={headingStyle}>Modo Serie/Documental</h1>
          <p style={subtitleStyle}>
            Cuenta historias multi-episodio: planificación, construcción, acabados, entrega.
          </p>
        </div>
        <Link href={`/${locale}/studio-app/series/new`} style={ctaStyle}>
          Crear nueva serie
        </Link>
      </div>

      {list.isLoading ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Cargando series"
          data-testid="series-list-loading"
          style={{ ...gridStyle, marginTop: 24 }}
        >
          {SKELETON_KEYS.map((key) => (
            <div key={key} aria-hidden="true" style={skeletonCardStyle} />
          ))}
        </div>
      ) : null}

      {!list.isLoading && (list.data?.series.length ?? 0) === 0 ? (
        <div
          style={{
            ...cardStyle,
            marginTop: 24,
            textAlign: 'center',
            padding: 48,
            cursor: 'default',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: '#FFFFFF',
            }}
          >
            Aún no tienes series
          </div>
          <div style={{ ...subtitleStyle, marginTop: 8 }}>
            Una serie documental cuenta la historia de un proyecto en multiples capítulos.
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href={`/${locale}/studio-app/series/new`} style={ctaStyle}>
              Crear mi primera serie
            </Link>
          </div>
        </div>
      ) : null}

      <div style={gridStyle}>
        {(list.data?.series ?? []).map((s) => (
          <Link key={s.id} href={`/${locale}/studio-app/series/${s.id}`} style={cardStyle}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 18,
                  color: '#FFFFFF',
                }}
              >
                {s.title}
              </div>
              <EpisodeStatusBadge
                status={
                  s.status === 'draft'
                    ? 'pending'
                    : s.status === 'published'
                      ? 'published'
                      : s.status === 'archived'
                        ? 'archived'
                        : 'in_progress'
                }
              />
            </div>
            <div style={{ ...subtitleStyle, marginTop: 8 }}>
              {s.episodes_count} episodios
              {s.auto_progress_enabled ? ' · auto-trigger ON' : ''}
              {s.is_published_publicly ? ' · pública' : ''}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
