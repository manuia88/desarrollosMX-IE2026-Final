'use client';

// F14.F.8 Sprint 7 BIBLIA Tarea 7.5 — Video de Zona flow (3 pasos).

import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { ZoneSmartSelector } from './ZoneSmartSelector';

export function ZoneVideoFlow() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const createMutation = trpc.studio.sprint7ZoneVideos.create.useMutation();

  function handleCreate() {
    if (!selectedZoneId) return;
    createMutation.mutate({ zoneId: selectedZoneId }, { onSuccess: () => setStep(3) });
  }

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '28px',
          color: 'var(--canon-cream)',
        }}
      >
        Video de Zona
      </h1>

      {step === 1 ? (
        <ZoneSmartSelector
          onSelect={(zoneId) => {
            setSelectedZoneId(zoneId);
            setStep(2);
          }}
        />
      ) : null}

      {step === 2 && selectedZoneId ? (
        <Card variant="elevated">
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ color: 'var(--canon-cream)' }}>
              Confirmar generación de video para zona seleccionada.
            </p>
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={createMutation.isPending}
              aria-label="Generar video de zona"
            >
              {createMutation.isPending ? 'Generando…' : 'Generar Video de Zona'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep(1);
                setSelectedZoneId(null);
              }}
              aria-label="Volver al selector"
            >
              Cambiar zona
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 3 && createMutation.data ? (
        <Card variant="spotlight">
          <div style={{ padding: '24px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '20px',
                color: 'var(--canon-cream)',
              }}
            >
              Video creado · {createMutation.data.zoneVideo.zone_name}
            </h2>
            <pre
              style={{
                marginTop: '16px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {JSON.stringify(createMutation.data.scores, null, 2)}
            </pre>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
