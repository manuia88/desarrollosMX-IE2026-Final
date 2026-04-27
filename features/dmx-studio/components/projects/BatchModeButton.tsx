'use client';

// F14.F.5 Sprint 4 — DMX Studio Batch Mode toggle (Agency only).
// Gating split en 2 sub-componentes:
//   - BatchModeUpgradeNotice: pure render, sin hooks. Mostrado cuando plan != agency.
//   - BatchModeActiveButton: hooks (useState + tRPC mutation). Mostrado cuando plan = agency.
// Wrapper BatchModeButton elige entre los 2 sin tocar hooks ella misma — facilita
// el patrón Modo A test sin RTL render.
//
// STUB ADR-018 — el pipeline de render real está diferido. La mutation crea 3
// proyectos child draft con meta.batch_pending=true y devuelve parentProjectId.
// Activar pipeline real cuando founder OK consumo créditos (memoria zero gasto).

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { StudioPlanKey } from '@/features/dmx-studio/lib/stripe-products';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface BatchModeButtonProps {
  readonly projectId: string;
  readonly currentPlan: StudioPlanKey | null;
  readonly locale: string;
  readonly onSuccess?: (parentProjectId: string, childIds: ReadonlyArray<string>) => void;
}

export function BatchModeButton(props: BatchModeButtonProps) {
  if (props.currentPlan !== 'agency') {
    return <BatchModeUpgradeNotice locale={props.locale} />;
  }
  return <BatchModeActiveButton projectId={props.projectId} onSuccess={props.onSuccess} />;
}

interface UpgradeNoticeProps {
  readonly locale: string;
}

export function BatchModeUpgradeNotice({ locale }: UpgradeNoticeProps) {
  return (
    <div
      data-testid="batch-mode-upgrade"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        borderRadius: 'var(--canon-radius-card)',
        background: 'var(--surface-recessed)',
        border: '1px solid var(--canon-border)',
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="md"
        disabled
        aria-label="Modo Batch disponible solo en plan Agency"
      >
        Generar 3 versiones (lujo / familiar / inversionista)
      </Button>
      <Link
        href={`/${locale}/studio/precios`}
        aria-label="Upgrade a plan Agency"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          alignSelf: 'flex-start',
          padding: '6px 14px',
          borderRadius: 'var(--canon-radius-pill)',
          background: 'var(--gradient-ai)',
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 600,
          textDecoration: 'none',
        }}
        data-testid="batch-mode-upgrade-link"
      >
        Upgrade a Agency $97
      </Link>
    </div>
  );
}

interface ActiveButtonProps {
  readonly projectId: string;
  readonly onSuccess?:
    | ((parentProjectId: string, childIds: ReadonlyArray<string>) => void)
    | undefined;
}

export function BatchModeActiveButton({ projectId, onSuccess }: ActiveButtonProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState<number | null>(null);

  const createBatch = trpc.studio.batchMode.createBatch.useMutation();

  const handleClick = useCallback(async () => {
    setSubmitError(null);
    setCompletedCount(null);
    try {
      const result = await createBatch.mutateAsync({ projectId });
      setCompletedCount(result.count);
      if (onSuccess) {
        onSuccess(result.parentProjectId, result.batchProjectIds);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setSubmitError(msg);
    }
  }, [createBatch, onSuccess, projectId]);

  const isPending = createBatch.isPending;

  return (
    <div
      data-testid="batch-mode-active"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        borderRadius: 'var(--canon-radius-card)',
        background: 'var(--surface-elevated)',
        border: '1px solid var(--canon-card-border-default)',
      }}
    >
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleClick}
        disabled={isPending}
        aria-busy={isPending}
        data-testid="batch-mode-trigger"
      >
        {isPending
          ? 'Generando 3 versiones…'
          : 'Generar 3 versiones (lujo / familiar / inversionista)'}
      </Button>
      {completedCount !== null && (
        <p
          role="status"
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--canon-cream-2)',
          }}
          data-testid="batch-mode-success"
        >
          {completedCount} versiones creadas en estado borrador. Render diferido en H1.
        </p>
      )}
      {submitError && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '10px 12px',
            background: 'rgba(244,63,94,0.10)',
            border: '1px solid rgba(244,63,94,0.30)',
            borderRadius: 'var(--canon-radius-card)',
            fontSize: '12.5px',
            color: '#FCA5A5',
          }}
          data-testid="batch-mode-error"
        >
          {submitError}
        </p>
      )}
    </div>
  );
}
