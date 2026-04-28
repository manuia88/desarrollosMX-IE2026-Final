'use client';

// F14.F.8 Sprint 7 BIBLIA Upgrade 5 — Smart selector top 3 zones.

import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

interface Props {
  readonly onSelect: (zoneId: string) => void;
}

export function ZoneSmartSelector({ onSelect }: Props) {
  const query = trpc.studio.sprint7ZoneVideos.getZoneSuggestions.useQuery();

  if (query.isLoading) {
    return <div style={{ padding: '24px' }}>Analizando tus zonas más activas…</div>;
  }
  const suggestions = query.data?.suggestions ?? [];

  if (suggestions.length === 0) {
    return (
      <Card variant="recessed">
        <div style={{ padding: '24px', color: 'rgba(255,255,255,0.7)' }}>
          Aún no tienes zonas con actividad suficiente. Trabaja con leads o cierra una operación
          para activar el smart selector.
        </div>
      </Card>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Zonas sugeridas"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}
    >
      {suggestions.map((s) => (
        <Card key={s.zoneId} variant="elevated" hoverable>
          <div
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minHeight: '180px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--canon-cream)',
              }}
            >
              {s.zoneName}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.5,
              }}
            >
              {s.reason}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSelect(s.zoneId)}
              aria-label={`Seleccionar ${s.zoneName}`}
              style={{ marginTop: 'auto' }}
            >
              Crear video aquí
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
