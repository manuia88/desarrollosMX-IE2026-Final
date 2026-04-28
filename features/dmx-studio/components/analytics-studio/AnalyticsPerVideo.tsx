'use client';

// F14.F.8 Sprint 7 BIBLIA Tarea 7.4 — Analytics per video.

import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

interface Props {
  readonly videoId: string;
}

export function AnalyticsPerVideo({ videoId }: Props) {
  const query = trpc.studio.sprint7Analytics.getByVideo.useQuery({ videoId });

  if (query.isLoading) return <div style={{ padding: '24px' }}>Cargando…</div>;
  const data = query.data;
  if (!data) return <div style={{ padding: '24px' }}>Sin datos</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>VIDEO</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '20px',
              color: 'var(--canon-cream)',
              marginTop: '4px',
            }}
          >
            {data.video.hook_variant} · {data.video.format}
          </div>
        </div>
      </Card>

      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              color: 'var(--canon-cream)',
              marginBottom: '8px',
            }}
          >
            Visualizaciones
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '36px',
              color: '#6366F1',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {data.viewsCount}
          </div>
        </div>
      </Card>

      <Card variant="elevated">
        <div style={{ padding: '20px' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '14px',
              color: 'var(--canon-cream)',
              marginBottom: '12px',
            }}
          >
            Por país
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.viewsByCountry.map((row) => (
              <li
                key={row.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <span>{row.name}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {data.feedback ? (
        <Card variant="elevated">
          <div style={{ padding: '20px' }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--canon-cream)',
                marginBottom: '12px',
              }}
            >
              Tu feedback
            </h3>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
              Rating: {data.feedback.rating ?? 'N/A'}/5
            </div>
            {data.feedback.comments ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '8px' }}>
                {data.feedback.comments}
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
