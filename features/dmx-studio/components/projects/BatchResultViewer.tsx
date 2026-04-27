'use client';

// F14.F.5 Sprint 4 — DMX Studio Batch Mode result viewer (Agency only).
// Renders 3 cards side-by-side per child project (one per style variant).
// H1: cards muestran metadata (style + draft status) sin video preview real
// porque pipeline real está diferido (STUB ADR-018).
//
// Component split for testability:
//   - BatchResultViewer: hook-bound wrapper (useQuery).
//   - BatchResultPresentation: pure render contract — accepts data + locale.

import Link from 'next/link';
import {
  type BatchStyleKey,
  STYLE_OVERRIDES,
} from '@/features/dmx-studio/lib/batch-mode/style-overrides';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

export interface BatchResultViewerProps {
  readonly parentProjectId: string;
  readonly locale: string;
}

export interface BatchChildRow {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly batchVariant: string | null;
  readonly batchPending: boolean;
  readonly createdAt: string;
}

export interface BatchPresentationData {
  readonly parentProjectId: string;
  readonly parentTitle: string;
  readonly children: ReadonlyArray<BatchChildRow>;
}

export interface BatchResultPresentationProps {
  readonly state:
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'empty' }
    | { kind: 'data'; data: BatchPresentationData };
  readonly locale: string;
}

const VARIANT_BADGE_GRADIENT: Readonly<Record<BatchStyleKey, string>> = {
  lujo: 'linear-gradient(90deg, #6366F1, #EC4899)',
  familiar: 'linear-gradient(90deg, #F59E0B, #EC4899)',
  inversionista: 'linear-gradient(90deg, #6366F1, #38BDF8)',
};

function isBatchStyleKey(value: string | null): value is BatchStyleKey {
  return value === 'lujo' || value === 'familiar' || value === 'inversionista';
}

export function BatchResultViewer({ parentProjectId, locale }: BatchResultViewerProps) {
  const query = trpc.studio.batchMode.getBatchProjects.useQuery({ parentProjectId });

  if (query.isLoading) {
    return <BatchResultPresentation state={{ kind: 'loading' }} locale={locale} />;
  }
  if (query.error) {
    return (
      <BatchResultPresentation
        state={{ kind: 'error', message: query.error.message }}
        locale={locale}
      />
    );
  }
  const data = query.data;
  if (!data || data.children.length === 0) {
    return <BatchResultPresentation state={{ kind: 'empty' }} locale={locale} />;
  }
  return <BatchResultPresentation state={{ kind: 'data', data }} locale={locale} />;
}

export function BatchResultPresentation({ state, locale }: BatchResultPresentationProps) {
  if (state.kind === 'loading') {
    return (
      <p
        style={{ color: 'var(--canon-cream-2)', fontSize: '13px', margin: 0 }}
        data-testid="batch-result-loading"
      >
        Cargando versiones…
      </p>
    );
  }

  if (state.kind === 'error') {
    return (
      <p
        role="alert"
        style={{
          margin: 0,
          padding: '12px 16px',
          background: 'rgba(244,63,94,0.10)',
          border: '1px solid rgba(244,63,94,0.30)',
          borderRadius: 'var(--canon-radius-card)',
          fontSize: '13px',
          color: '#FCA5A5',
        }}
        data-testid="batch-result-error"
      >
        {state.message}
      </p>
    );
  }

  if (state.kind === 'empty') {
    return (
      <p
        style={{ color: 'var(--canon-cream-2)', fontSize: '13px', margin: 0 }}
        data-testid="batch-result-empty"
      >
        Aún no hay versiones generadas para este proyecto.
      </p>
    );
  }

  const data = state.data;

  return (
    <section
      aria-label={`Versiones batch del proyecto ${data.parentTitle}`}
      data-testid="batch-result-viewer"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2
          className="font-[var(--font-display)] text-xl font-bold"
          style={{ color: 'var(--canon-cream)', margin: 0 }}
        >
          Versiones generadas
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--canon-cream-2)' }}>
          {data.children.length} versiones en borrador. Render diferido a próxima fase.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {data.children.map((child) => {
          const styleKey = isBatchStyleKey(child.batchVariant) ? child.batchVariant : null;
          const override = styleKey ? STYLE_OVERRIDES[styleKey] : null;
          const badgeGradient = styleKey
            ? VARIANT_BADGE_GRADIENT[styleKey]
            : 'linear-gradient(90deg, #64748B, #94A3B8)';
          return (
            <Card
              key={child.id}
              variant="elevated"
              hoverable
              data-testid={`batch-card-${child.id}`}
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  padding: '4px 12px',
                  borderRadius: 'var(--canon-radius-pill)',
                  background: badgeGradient,
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
                data-testid={`batch-card-badge-${child.id}`}
              >
                {override?.displayName ?? child.batchVariant ?? 'variante'}
              </span>

              <h3
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--canon-cream)',
                  lineHeight: 1.3,
                }}
              >
                {child.title}
              </h3>

              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  gap: '4px',
                  margin: 0,
                  fontSize: '12.5px',
                  color: 'var(--canon-cream-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <dt>Estado</dt>
                  <dd style={{ margin: 0, fontWeight: 600, color: 'var(--canon-cream)' }}>
                    {child.batchPending ? 'Borrador' : child.status}
                  </dd>
                </div>
                {override && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <dt>Cámara</dt>
                      <dd style={{ margin: 0, fontWeight: 600, color: 'var(--canon-cream)' }}>
                        {override.camera}
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <dt>Color</dt>
                      <dd style={{ margin: 0, fontWeight: 600, color: 'var(--canon-cream)' }}>
                        {override.colorGrade}
                      </dd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <dt>Música</dt>
                      <dd style={{ margin: 0, fontWeight: 600, color: 'var(--canon-cream)' }}>
                        {override.musicMood}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <Link
                href={`/${locale}/studio-app/projects/${child.id}`}
                aria-label={`Ver detalle de ${child.title}`}
                data-testid={`batch-card-link-${child.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-start',
                  height: '34px',
                  padding: '0 14px',
                  borderRadius: 'var(--canon-radius-pill)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'var(--canon-cream)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Ver detalle
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
