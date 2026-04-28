'use client';

// F14.F.10 Sprint 9 SUB-AGENT 4 — Pricing calculator widget (Upgrade LATERAL 8).
// Cliente final ve precio total con markup fotógrafo. Llama previewPricing tRPC.
// Split: computePricingFallback (pure) + PricingCalculatorPresentation (pure render)
// + PricingCalculator (smart wrapper con tRPC + state).

import { type CSSProperties, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';

interface SmartProps {
  readonly photographerId: string;
  readonly initialMarkupPct: number;
}

export interface PricingPreview {
  readonly studioCostUsd: number;
  readonly markupPct: number;
  readonly totalClientUsd: number;
  readonly breakdown: {
    readonly baseFotoPlan: number;
    readonly extraVideosUsd: number;
    readonly markupAmountUsd: number;
  };
}

export type VideoType = 'todos' | 'listado' | 'serie';

interface PresentationProps {
  readonly videosPerMonth: number;
  readonly type: VideoType;
  readonly data: PricingPreview;
  readonly onVideosChange: (n: number) => void;
  readonly onTypeChange: (t: VideoType) => void;
}

const sectionStyle: CSSProperties = {
  background: 'var(--surface-elevated)',
  borderRadius: 'var(--canon-radius-card)',
  border: '1px solid var(--canon-border)',
  padding: '32px',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-text)',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.65)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '8px',
  border: '1px solid var(--canon-border-2)',
  background: 'rgba(0,0,0,0.2)',
  color: 'var(--canon-cream)',
  fontSize: '14px',
  fontFamily: 'var(--font-text)',
};

const breakdownRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  fontFamily: 'var(--font-text)',
  fontSize: '14px',
};

function formatUsd(n: number): string {
  return `$${n.toFixed(2)} USD`;
}

/**
 * Pure pricing fallback computation. Mirror del backend previewPricing procedure.
 * Permite render sin esperar tRPC + tests deterministas.
 */
export function computePricingFallback(videosPerMonth: number, markupPct: number): PricingPreview {
  const baseUsd = 67;
  const includedVideos = 50;
  const extraVideos = Math.max(0, videosPerMonth - includedVideos);
  const studioCost = baseUsd + extraVideos * 1.5;
  const totalClient = studioCost * (1 + markupPct / 100);
  return {
    studioCostUsd: Number(studioCost.toFixed(2)),
    markupPct,
    totalClientUsd: Number(totalClient.toFixed(2)),
    breakdown: {
      baseFotoPlan: baseUsd,
      extraVideosUsd: Number((extraVideos * 1.5).toFixed(2)),
      markupAmountUsd: Number(((studioCost * markupPct) / 100).toFixed(2)),
    },
  };
}

export function PricingCalculatorPresentation({
  videosPerMonth,
  type,
  data,
  onVideosChange,
  onTypeChange,
}: PresentationProps) {
  return (
    <section style={sectionStyle} aria-label="Calculadora de precios">
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '22px',
          color: 'var(--canon-cream)',
          marginTop: 0,
        }}
      >
        Calculadora de precios
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-text)',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.7)',
          lineHeight: 1.5,
        }}
      >
        Estima el costo mensual según el volumen de videos que necesitas.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginTop: '20px',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Videos por mes: {videosPerMonth}</span>
          <input
            type="range"
            min={1}
            max={200}
            step={1}
            value={videosPerMonth}
            onChange={(e) => onVideosChange(Number(e.target.value))}
            aria-label="Videos por mes"
            data-testid="calc-videos-slider"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={labelStyle}>Tipo de contenido</span>
          <select
            style={inputStyle}
            value={type}
            onChange={(e) => onTypeChange(e.target.value as VideoType)}
            aria-label="Tipo de contenido"
            data-testid="calc-type-select"
          >
            <option value="todos">Todos los tipos</option>
            <option value="listado">Solo por listado</option>
            <option value="serie">Solo serie/documental</option>
          </select>
        </label>
      </div>

      <div
        style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: 'var(--canon-radius-card)',
          background: 'rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        data-testid="calc-breakdown"
      >
        <div style={breakdownRowStyle}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Plan Foto base (50 videos)</span>
          <span style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(data.breakdown.baseFotoPlan)}
          </span>
        </div>
        <div style={breakdownRowStyle}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Videos extra</span>
          <span style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(data.breakdown.extraVideosUsd)}
          </span>
        </div>
        <div style={breakdownRowStyle}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Costo Studio</span>
          <span style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(data.studioCostUsd)}
          </span>
        </div>
        <div style={breakdownRowStyle}>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            Markup fotógrafo ({data.markupPct}%)
          </span>
          <span style={{ color: 'var(--canon-cream)', fontVariantNumeric: 'tabular-nums' }}>
            {formatUsd(data.breakdown.markupAmountUsd)}
          </span>
        </div>
        <div
          style={{
            ...breakdownRowStyle,
            paddingTop: '16px',
            marginTop: '8px',
            borderBottom: 'none',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            fontWeight: 700,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '16px',
              color: 'var(--canon-cream)',
            }}
          >
            Total cliente final
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--canon-cream)',
              fontVariantNumeric: 'tabular-nums',
              backgroundImage: 'linear-gradient(90deg, #6366F1, #EC4899)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            data-testid="calc-total"
          >
            {formatUsd(data.totalClientUsd)}
          </span>
        </div>
      </div>
      <p
        style={{
          marginTop: '12px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'var(--font-text)',
        }}
      >
        Estimación mensual. El precio final puede variar según términos del fotógrafo.
      </p>
    </section>
  );
}

export function PricingCalculator({ photographerId, initialMarkupPct }: SmartProps) {
  const [videosPerMonth, setVideosPerMonth] = useState<number>(50);
  const [type, setType] = useState<VideoType>('todos');

  const previewQuery = trpc.studio.sprint9Photographer.previewPricing.useQuery(
    { photographerId, videosPerMonth },
    { staleTime: 5_000 },
  );

  const fallback = computePricingFallback(videosPerMonth, initialMarkupPct);
  const data: PricingPreview = previewQuery.data ?? fallback;

  return (
    <PricingCalculatorPresentation
      videosPerMonth={videosPerMonth}
      type={type}
      data={data}
      onVideosChange={setVideosPerMonth}
      onTypeChange={setType}
    />
  );
}
