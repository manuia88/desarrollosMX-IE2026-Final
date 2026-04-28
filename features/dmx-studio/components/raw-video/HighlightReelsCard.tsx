'use client';

// F14.F.6 Sprint 5 BIBLIA LATERAL 8 — Highlight reels card.

import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface HighlightReelsCardProps {
  readonly rawVideoId: string;
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  return `${sec}s`;
}

export function HighlightReelsCard({ rawVideoId }: HighlightReelsCardProps) {
  const listQuery = trpc.studio.highlightReels.list.useQuery({ rawVideoId });
  const generateMutation = trpc.studio.highlightReels.generate.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  const reels = listQuery.data ?? [];

  return (
    <section
      aria-label="Highlight reels"
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--canon-radius-card)',
        padding: '24px',
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--canon-cream)' }}>
          Highlight reels
        </h2>
        {reels.length === 0 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => generateMutation.mutate({ rawVideoId })}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generando...' : 'Generar 3 reels'}
          </Button>
        ) : null}
      </header>

      {reels.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--canon-cream-2)', marginTop: '12px' }}>
          Solo videos &gt; 5 min. Studio detectará 3 momentos más impactantes.
        </p>
      ) : (
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            listStyle: 'none',
            padding: 0,
            marginTop: '16px',
          }}
        >
          {reels.map((reel) => (
            <li
              key={reel.id}
              style={{
                padding: '12px',
                borderRadius: 'var(--canon-radius-inner)',
                background: 'var(--surface-recessed)',
              }}
            >
              <p style={{ fontSize: '12px', color: 'var(--canon-cream-2)' }}>
                Reel #{reel.clip_index} · {formatDuration(reel.end_ms - reel.start_ms)}
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--canon-cream)',
                  marginTop: '4px',
                  lineHeight: 1.5,
                }}
              >
                {reel.reason}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--accent-teal)', marginTop: '4px' }}>
                Estado: {reel.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
