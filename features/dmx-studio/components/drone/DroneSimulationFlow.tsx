'use client';

// F14.F.7 Sprint 6 — Drone simulation flow: 3 steps (foto base → pattern → preview & generate).
// Internal state only. NO tRPC. Emits onGenerate callback.

import { useMemo, useState } from 'react';
import { DronePatternSelector } from '@/features/dmx-studio/components/drone/DronePatternSelector';
import {
  buildKlingPromptForPattern,
  estimateDroneCostUsd,
} from '@/features/dmx-studio/lib/drone-sim';
import {
  type PatternSuggestion,
  suggestPattern,
} from '@/features/dmx-studio/lib/drone-sim/heat-map-advisor';
import { getPatternBySlug } from '@/features/dmx-studio/lib/drone-sim/patterns';
import { Button } from '@/shared/ui/primitives/canon';

export interface DroneAsset {
  readonly id: string;
  readonly storage_url: string;
}

export interface DroneSimulationFlowProps {
  readonly assets: readonly DroneAsset[];
  readonly propertyMeta?: {
    readonly propertyType: 'terreno' | 'edificio' | 'casa' | 'panoramica' | 'otro';
    readonly hasViews?: boolean;
    readonly floors?: number;
  };
  readonly onGenerate: (input: {
    imageUrl: string;
    pattern: string;
    durationSeconds: number;
  }) => void;
}

type Step = 'foto' | 'pattern' | 'preview';

export function DroneSimulationFlow({
  assets,
  propertyMeta,
  onGenerate,
}: DroneSimulationFlowProps) {
  const [step, setStep] = useState<Step>('foto');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<string>('orbital');
  const [durationSeconds, setDurationSeconds] = useState<number>(8);

  const suggestion = useMemo<PatternSuggestion | undefined>(() => {
    if (!propertyMeta) return undefined;
    return suggestPattern(propertyMeta);
  }, [propertyMeta]);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? null;
  const patternMeta = getPatternBySlug(selectedPattern);
  const previewPrompt = buildKlingPromptForPattern(selectedPattern);
  const estCost = estimateDroneCostUsd(durationSeconds);

  function goNext() {
    if (step === 'foto' && selectedAssetId) setStep('pattern');
    else if (step === 'pattern') setStep('preview');
  }

  function goBack() {
    if (step === 'preview') setStep('pattern');
    else if (step === 'pattern') setStep('foto');
  }

  function handleGenerate() {
    if (!selectedAsset) return;
    onGenerate({
      imageUrl: selectedAsset.storage_url,
      pattern: selectedPattern,
      durationSeconds,
    });
  }

  return (
    <section
      aria-label="Flujo de simulación de drone"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <nav
        aria-label="Pasos del flujo"
        style={{
          display: 'flex',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--canon-cream-2)',
        }}
      >
        <span aria-current={step === 'foto' ? 'step' : undefined}>1. Foto base</span>
        <span aria-hidden="true">·</span>
        <span aria-current={step === 'pattern' ? 'step' : undefined}>2. Patrón</span>
        <span aria-hidden="true">·</span>
        <span aria-current={step === 'preview' ? 'step' : undefined}>3. Preview</span>
      </nav>

      {step === 'foto' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--canon-cream)' }}>
            Selecciona la foto base
          </h2>
          {assets.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--canon-cream-2)' }}>
              No hay fotos disponibles en este proyecto.
            </p>
          ) : (
            <ul
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '10px',
                listStyle: 'none',
                padding: 0,
                margin: 0,
              }}
            >
              {assets.map((asset) => {
                const isSelected = asset.id === selectedAssetId;
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Foto ${asset.id}`}
                      onClick={() => setSelectedAssetId(asset.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: 0,
                        cursor: 'pointer',
                        background: 'var(--surface-elevated)',
                        border: isSelected
                          ? '2px solid var(--accent-violet, #6366F1)'
                          : '2px solid transparent',
                        borderRadius: 'var(--canon-radius-card, 12px)',
                        overflow: 'hidden',
                        transition: 'transform 220ms ease',
                        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
                      }}
                    >
                      {/* biome-ignore lint/performance/noImgElement: signed storage URL preview, intentional */}
                      <img
                        src={asset.storage_url}
                        alt={`Foto ${asset.id}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {step === 'pattern' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--canon-cream)' }}>
            Elige patrón de drone
          </h2>
          <DronePatternSelector
            selectedSlug={selectedPattern}
            onSelect={(slug) => {
              setSelectedPattern(slug);
              const meta = getPatternBySlug(slug);
              if (meta) setDurationSeconds(meta.defaultDurationSeconds);
            }}
            {...(suggestion ? { suggestion } : {})}
          />
        </div>
      ) : null}

      {step === 'preview' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--canon-cream)' }}>
            Preview &amp; generar
          </h2>
          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px 16px',
              fontSize: '13px',
              color: 'var(--canon-cream)',
              margin: 0,
            }}
          >
            <dt style={{ color: 'var(--canon-cream-2)' }}>Patrón</dt>
            <dd style={{ margin: 0 }}>{patternMeta?.name ?? selectedPattern}</dd>
            <dt style={{ color: 'var(--canon-cream-2)' }}>Duración</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              <label style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                  aria-label="Duración en segundos"
                  style={{
                    width: '64px',
                    padding: '4px 6px',
                    background: 'var(--surface-recessed, var(--surface-elevated))',
                    border: '1px solid var(--canon-cream-3, transparent)',
                    color: 'var(--canon-cream)',
                    borderRadius: '6px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <span>segundos</span>
              </label>
            </dd>
            <dt style={{ color: 'var(--canon-cream-2)' }}>Prompt</dt>
            <dd style={{ margin: 0, fontSize: '12px', color: 'var(--canon-cream-2)' }}>
              {previewPrompt}
            </dd>
            <dt style={{ color: 'var(--canon-cream-2)' }}>Costo estimado</dt>
            <dd style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              USD ${estCost.toFixed(2)}
            </dd>
          </dl>
        </div>
      ) : null}

      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <Button
          variant="ghost"
          size="md"
          onClick={goBack}
          disabled={step === 'foto'}
          aria-label="Paso anterior"
        >
          Atrás
        </Button>
        {step === 'preview' ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleGenerate}
            disabled={!selectedAsset}
            aria-label="Generar simulación de drone"
          >
            Generar simulación
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={goNext}
            disabled={step === 'foto' && !selectedAssetId}
            aria-label="Paso siguiente"
          >
            Siguiente
          </Button>
        )}
      </footer>
    </section>
  );
}
