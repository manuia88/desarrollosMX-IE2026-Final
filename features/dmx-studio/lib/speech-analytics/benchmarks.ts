// F14.F.6 Sprint 5 BIBLIA LATERAL 7 — Benchmarks vs top inmobiliarios.

export interface SpeechBenchmarks {
  wpmTopMin: number;
  wpmTopMax: number;
  fillerRatioMaxPct: number;
  clarityScoreMin: number;
  source: string;
}

export const TOP_INMOBILIARIO_BENCHMARKS: SpeechBenchmarks = {
  wpmTopMin: 160,
  wpmTopMax: 180,
  fillerRatioMaxPct: 2,
  clarityScoreMin: 80,
  source: 'BIBLIA DMX Studio v4 — top inmobiliarios LATAM benchmark canon 2026',
};

export interface UserAnalyticsLite {
  words_per_minute?: number | null;
  filler_ratio_pct?: number | null;
  clarity_score?: number | null;
}

export interface BenchmarkComparison {
  wpm: { user: number | null; tier: 'low' | 'optimal' | 'high'; suggestion: string };
  filler: { user: number | null; tier: 'optimal' | 'high'; suggestion: string };
  clarity: { user: number | null; tier: 'low' | 'optimal'; suggestion: string };
}

export function compareToBenchmarks(user: UserAnalyticsLite): BenchmarkComparison {
  const wpm = user.words_per_minute ?? null;
  const filler = user.filler_ratio_pct ?? null;
  const clarity = user.clarity_score ?? null;
  const b = TOP_INMOBILIARIO_BENCHMARKS;

  const wpmTier: BenchmarkComparison['wpm']['tier'] =
    wpm === null ? 'low' : wpm < b.wpmTopMin ? 'low' : wpm > b.wpmTopMax ? 'high' : 'optimal';
  const wpmSuggestion =
    wpmTier === 'low'
      ? `Sube ritmo: top inmobiliarios hablan ${b.wpmTopMin}-${b.wpmTopMax} WPM`
      : wpmTier === 'high'
        ? 'Reduce velocidad: pierde claridad sobre 180 WPM'
        : 'Velocidad óptima';

  const fillerTier: BenchmarkComparison['filler']['tier'] =
    filler === null ? 'high' : filler > b.fillerRatioMaxPct ? 'high' : 'optimal';
  const fillerSuggestion =
    fillerTier === 'high'
      ? `Reduce muletillas: top inmobiliarios <${b.fillerRatioMaxPct}%`
      : 'Muletillas controladas';

  const clarityTier: BenchmarkComparison['clarity']['tier'] =
    clarity === null ? 'low' : clarity < b.clarityScoreMin ? 'low' : 'optimal';
  const claritySuggestion =
    clarityTier === 'low' ? `Mejora claridad: target ≥${b.clarityScoreMin}/100` : 'Claridad óptima';

  return {
    wpm: { user: wpm, tier: wpmTier, suggestion: wpmSuggestion },
    filler: { user: filler, tier: fillerTier, suggestion: fillerSuggestion },
    clarity: { user: clarity, tier: clarityTier, suggestion: claritySuggestion },
  };
}
