'use client';

// F14.F.6 Sprint 5 BIBLIA LATERAL 7 — Benchmarks vs top inmobiliarios.

import type { BenchmarkComparison as Comparison } from '@/features/dmx-studio/lib/speech-analytics/benchmarks';

export interface BenchmarkComparisonProps {
  readonly comparison: Comparison;
}

const TIER_COLOR: Record<string, string> = {
  optimal: 'var(--accent-teal)',
  low: 'var(--canon-amber)',
  high: 'var(--canon-red)',
};

export function BenchmarkComparison({ comparison }: BenchmarkComparisonProps) {
  return (
    <section
      aria-label="Comparativa benchmarks"
      style={{
        background: 'var(--surface-elevated)',
        borderRadius: 'var(--canon-radius-card)',
        padding: '24px',
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--canon-cream)' }}>
        Comparativa vs top inmobiliarios
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, marginTop: '16px' }}>
        <BenchmarkRow
          label="Velocidad"
          value={comparison.wpm.user !== null ? `${comparison.wpm.user} WPM` : '—'}
          tier={comparison.wpm.tier}
          suggestion={comparison.wpm.suggestion}
        />
        <BenchmarkRow
          label="Muletillas"
          value={comparison.filler.user !== null ? `${comparison.filler.user}%` : '—'}
          tier={comparison.filler.tier}
          suggestion={comparison.filler.suggestion}
        />
        <BenchmarkRow
          label="Claridad"
          value={comparison.clarity.user !== null ? `${comparison.clarity.user}/100` : '—'}
          tier={comparison.clarity.tier}
          suggestion={comparison.clarity.suggestion}
        />
      </ul>
    </section>
  );
}

interface BenchmarkRowProps {
  label: string;
  value: string;
  tier: string;
  suggestion: string;
}

function BenchmarkRow({ label, value, tier, suggestion }: BenchmarkRowProps) {
  const color = TIER_COLOR[tier] ?? 'var(--canon-cream)';
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 100px 1fr',
        gap: '12px',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid var(--canon-border)',
      }}
    >
      <span style={{ fontSize: '13px', color: 'var(--canon-cream-2)' }}>{label}</span>
      <span style={{ fontSize: '15px', fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'var(--canon-cream-2)' }}>{suggestion}</span>
    </li>
  );
}
