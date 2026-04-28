'use client';

// F14.F.7 Sprint 6 BIBLIA v4 §6 UPGRADE 2+7 — Staging flow (3 steps: detect → style → confirm).
// DMX Studio dentro DMX único entorno (ADR-054). NO tRPC calls; emits onConfirm callback.

import { useMemo, useState } from 'react';
import { detectEmptyByMeta } from '@/features/dmx-studio/lib/virtual-staging/empty-room-detector';
import {
  MULTI_BATCH_MAX_ASSETS,
  prepareBatchPlan,
} from '@/features/dmx-studio/lib/virtual-staging/multi-staging-batch';
import { getStyleBySlug } from '@/features/dmx-studio/lib/virtual-staging/styles-canon';
import { Button, Card, cn } from '@/shared/ui/primitives/canon';
import { StyleSelector } from './StyleSelector';

const COST_PER_RENDER_USD = 0.5;

export interface StagingFlowAsset {
  readonly id: string;
  readonly storage_url: string;
  readonly ai_classification?: unknown;
  readonly meta?: unknown;
}

export interface StagingFlowConfirmPayload {
  readonly projectId: string;
  readonly assetIds: ReadonlyArray<string>;
  readonly styleSlug: string;
  readonly estimatedCostUsd: number;
}

export interface StagingFlowProps {
  readonly projectId: string;
  readonly assets: ReadonlyArray<StagingFlowAsset>;
  readonly onConfirm?: (payload: StagingFlowConfirmPayload) => void;
}

type Step = 1 | 2 | 3;

export function StagingFlow({ projectId, assets, onConfirm }: StagingFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedAssetIds, setSelectedAssetIds] = useState<ReadonlyArray<string>>([]);
  const [styleSlug, setStyleSlug] = useState<string>('modern');

  const emptyCandidates = useMemo(() => {
    return assets.filter((a) =>
      detectEmptyByMeta({
        ai_classification: a.ai_classification,
        meta: a.meta,
      }),
    );
  }, [assets]);

  const allEmptyIds = useMemo(() => emptyCandidates.map((c) => c.id), [emptyCandidates]);
  const allSelected = selectedAssetIds.length > 0 && selectedAssetIds.length === allEmptyIds.length;

  function toggleAsset(id: string) {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAll() {
    setSelectedAssetIds(allSelected ? [] : allEmptyIds);
  }

  const selectedStyle = getStyleBySlug(styleSlug);
  const estimatedCostUsd = selectedAssetIds.length * COST_PER_RENDER_USD;

  function handleConfirm() {
    if (!onConfirm) return;
    const plan = prepareBatchPlan(
      assets
        .filter((a) => selectedAssetIds.includes(a.id))
        .map((a) => ({ id: a.id, storage_url: a.storage_url })),
    );
    onConfirm({
      projectId,
      assetIds: plan.batchSlots.map((s) => s.assetId),
      styleSlug,
      estimatedCostUsd: plan.totalAssets * COST_PER_RENDER_USD,
    });
  }

  return (
    <section aria-label="Flujo de virtual staging" className="flex flex-col gap-5">
      <ol aria-label="Pasos del flujo" className="flex items-center gap-2 list-none p-0 m-0">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            aria-current={step === (n as Step) ? 'step' : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5',
              'text-[12px] font-semibold',
              'rounded-[var(--canon-radius-pill)]',
              step === (n as Step)
                ? 'bg-[color:rgba(99,102,241,0.18)] text-[color:var(--canon-cream)] border border-[color:var(--canon-indigo-2)]'
                : 'bg-[var(--surface-recessed)] text-[color:var(--canon-cream-2)] border border-transparent',
            )}
          >
            <span
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center text-[11px] font-bold',
                'rounded-full',
                step === (n as Step)
                  ? 'bg-[color:var(--canon-indigo-2)] text-[color:var(--canon-bg)]'
                  : 'bg-[color:rgba(255,255,255,0.08)] text-[color:var(--canon-cream-2)]',
              )}
            >
              {n}
            </span>
            <span>{n === 1 ? 'Detectar' : n === 2 ? 'Estilo' : 'Confirmar'}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card variant="elevated" className="p-5">
          <h2 className="text-[16px] font-bold text-[color:var(--canon-cream)]">
            Habitaciones vacías detectadas
          </h2>
          <p className="text-[12px] text-[color:var(--canon-cream-2)] mt-1">
            Seleccionamos automáticamente fotos clasificadas como vacías. Elige cuáles enviar a
            staging.
          </p>

          {emptyCandidates.length === 0 ? (
            <p className="text-[13px] text-[color:var(--canon-cream-2)] mt-4">
              No se detectaron habitaciones vacías en este proyecto.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[12px] text-[color:var(--canon-cream-2)]">
                  {selectedAssetIds.length} de {emptyCandidates.length} seleccionadas
                </p>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[12px] font-semibold text-[color:var(--canon-indigo-2)] hover:text-[color:var(--canon-cream)] focus-visible:outline-none focus-visible:underline"
                >
                  {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </button>
              </div>

              <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 list-none p-0">
                {emptyCandidates.map((asset) => {
                  const isChecked = selectedAssetIds.includes(asset.id);
                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        onClick={() => toggleAsset(asset.id)}
                        aria-pressed={isChecked}
                        aria-label={`Seleccionar foto ${asset.id}`}
                        className={cn(
                          'w-full p-3 text-left',
                          'rounded-[var(--canon-radius-card)] border-2 transition-all',
                          'hover:-translate-y-px',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canon-bg)]',
                          isChecked
                            ? 'border-[color:var(--canon-indigo-2)] bg-[color:rgba(99,102,241,0.12)]'
                            : 'border-transparent bg-[var(--surface-recessed)] hover:border-[color:rgba(99,102,241,0.30)]',
                        )}
                      >
                        <div
                          className="h-24 w-full rounded-[10px] bg-[color:rgba(255,255,255,0.04)] mb-2 overflow-hidden"
                          aria-hidden="true"
                        >
                          {/* biome-ignore lint/performance/noImgElement: signed Supabase Storage URLs need raw img tag (matches BrandKitForm precedent) */}
                          <img
                            src={asset.storage_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-[11px] text-[color:var(--canon-cream-2)] truncate">
                          {asset.id}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <Button
              variant="primary"
              size="md"
              disabled={selectedAssetIds.length === 0}
              onClick={() => setStep(2)}
            >
              Continuar a estilo
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card variant="elevated" className="p-5">
          <h2 className="text-[16px] font-bold text-[color:var(--canon-cream)]">
            Elige el estilo de staging
          </h2>
          <p className="text-[12px] text-[color:var(--canon-cream-2)] mt-1">
            Aplicaremos el mismo estilo a las {selectedAssetIds.length} fotos seleccionadas.
          </p>
          <div className="mt-4">
            <StyleSelector selectedSlug={styleSlug} onSelect={setStyleSlug} />
          </div>
          <div className="flex justify-between gap-3 mt-5">
            <Button variant="ghost" size="md" onClick={() => setStep(1)}>
              Volver
            </Button>
            <Button variant="primary" size="md" onClick={() => setStep(3)}>
              Continuar a confirmación
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card variant="elevated" className="p-5">
          <h2 className="text-[16px] font-bold text-[color:var(--canon-cream)]">
            Confirmar staging
          </h2>

          <dl className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)] p-4">
              <dt className="text-[11px] uppercase tracking-wider text-[color:var(--canon-cream-2)]">
                Fotos
              </dt>
              <dd className="text-[20px] font-extrabold text-[color:var(--canon-cream)] tabular-nums mt-1">
                {selectedAssetIds.length}
              </dd>
            </div>
            <div className="rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)] p-4">
              <dt className="text-[11px] uppercase tracking-wider text-[color:var(--canon-cream-2)]">
                Estilo
              </dt>
              <dd className="text-[14px] font-bold text-[color:var(--canon-cream)] mt-1">
                {selectedStyle?.name ?? styleSlug}
              </dd>
              <p className="text-[11px] text-[color:var(--canon-cream-2)] mt-1">
                {selectedStyle?.description ?? ''}
              </p>
            </div>
            <div className="rounded-[var(--canon-radius-card)] bg-[var(--surface-recessed)] p-4">
              <dt className="text-[11px] uppercase tracking-wider text-[color:var(--canon-cream-2)]">
                Costo estimado
              </dt>
              <dd className="text-[20px] font-extrabold text-[color:var(--canon-cream)] tabular-nums mt-1">
                ${estimatedCostUsd.toFixed(2)} USD
              </dd>
              <p className="text-[11px] text-[color:var(--canon-cream-2)] mt-1">
                ${COST_PER_RENDER_USD.toFixed(2)} por foto
              </p>
            </div>
          </dl>

          {selectedAssetIds.length > MULTI_BATCH_MAX_ASSETS && (
            <p role="alert" className="text-[12px] text-[color:var(--canon-cream-2)] mt-3">
              Máximo {MULTI_BATCH_MAX_ASSETS} fotos por batch.
            </p>
          )}

          <div className="flex justify-between gap-3 mt-5">
            <Button variant="ghost" size="md" onClick={() => setStep(2)}>
              Volver
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={selectedAssetIds.length === 0}
              onClick={handleConfirm}
            >
              Iniciar staging
            </Button>
          </div>
        </Card>
      )}
    </section>
  );
}
