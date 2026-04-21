// BLOQUE 11.I.3 — Executive Narrative generator.
//
// Construye el resumen ejecutivo de 2 páginas + top 5 zone stories para el
// Scorecard Nacional trimestral usando el Causal Engine (inyectado vía hook
// para permitir testing sin LLM real y evitar acoplamiento cross-feature).
//
// Consumer responsibility: causalHook caller must NOT pass forceRegenerate=true
// (cost budget). El Causal Engine usa cache TTL por default — respetarlo.

import type {
  AlphaLifecycleSummary,
  CausalTimelineBundle,
  ExecutiveNarrative,
  MagnetExodusRanking,
  PulseHeroMetric,
  ScorecardBundle,
  ScorecardRankingSection,
} from '../types';

export type CausalHook = (
  prompt: string,
) => Promise<{ text: string; citations: readonly string[] }>;

type NarrativeBundleInput = Omit<ScorecardBundle, 'executive_narrative'>;

interface ZoneStoryInput {
  readonly zone_id: string;
  readonly zone_label: string;
  readonly period_date: string;
}

// Helpers puros (exportados para tests y reutilización).

export function formatExecutivePrompt(bundle: NarrativeBundleInput): string {
  const { country_code, period_date, pulse_hero, magnet_exodus, alpha_lifecycle, rankings } =
    bundle;

  const pulseLine = formatPulseHeroLine(pulse_hero);
  const magnetLine = formatMagnetExodusTop(magnet_exodus);
  const alphaLine = formatAlphaLifecycleLine(alpha_lifecycle);
  const rankingsBlock = formatTopRankingsBlock(rankings);

  return [
    `Eres el analista jefe de DMX Research. Redacta un resumen ejecutivo de 2 páginas (~800-1500 palabras) en español mexicano para el Scorecard Nacional ${country_code} ${period_date}.`,
    '',
    'Contexto de datos obligatorio (cítalos explícitamente en la narrativa):',
    `- Pulse Nacional: ${pulseLine}`,
    `- Migration Flow (Magnet/Exodus): ${magnetLine}`,
    `- Alpha Lifecycle: ${alphaLine}`,
    `- Top 3 rankings IPV/IAB/IDS:\n${rankingsBlock}`,
    '',
    'Estructura obligatoria del markdown:',
    '1. **Titular ejecutivo** (1 párrafo — qué pasó este trimestre en el mercado nacional).',
    '2. **Señales de vida** (Pulse + deltas).',
    '3. **Movilidad** (Magnet vs Exodus — por qué la gente se mueve).',
    '4. **Ciclo Alpha** (emerging → matured transitions, zonas destacadas).',
    '5. **Rankings destacados** (IPV, IAB, IDS — top 3 con delta).',
    '6. **Outlook** (1 párrafo — qué vigilar el próximo trimestre).',
    '',
    'Reglas de estilo: tono editorial Forbes/WSJ, zero hype, cero emojis, cita fuentes DMX verificables.',
  ].join('\n');
}

export function formatZoneStoryPrompt(
  zoneId: string,
  zoneLabel: string,
  bundle: NarrativeBundleInput,
): string {
  const pulseTop = findTopZonePulse(bundle.pulse_hero, zoneId);
  const alphaState = findAlphaStateForZone(bundle.alpha_lifecycle, zoneId);
  const ipvRank = findRankForZone(bundle.rankings, 'IPV', zoneId);
  const magnetInfo = findMagnetExodusForZone(bundle.magnet_exodus, zoneId);

  return [
    `Cuenta la historia de ${zoneLabel} (${zoneId}) en este trimestre (~200 palabras, markdown es-MX).`,
    '',
    'Datos verificables:',
    `- pulse=${pulseTop ?? 'n/d'}`,
    `- IPV=${ipvRank ?? 'n/d'}`,
    `- alpha_state=${alphaState ?? 'n/d'}`,
    `- magnet_exodus=${magnetInfo ?? 'n/d'}`,
    `- period=${bundle.period_date}`,
    '',
    'Reglas: cita al menos una fuente verificable (URL o score_id DMX), sin hype, tono narrativo breve.',
  ].join('\n');
}

function formatPulseHeroLine(pulse: PulseHeroMetric): string {
  const delta = pulse.delta_vs_previous === null ? 'n/d' : pulse.delta_vs_previous.toFixed(2);
  return `valor=${pulse.pulse_national.toFixed(2)} delta=${delta} top_zones=${pulse.top_zones
    .slice(0, 3)
    .map((z) => `${z.zone_label}:${z.pulse.toFixed(1)}`)
    .join(', ')}`;
}

function formatMagnetExodusTop(mx: MagnetExodusRanking): string {
  const topMagnet = mx.top_magnets[0];
  const topExodus = mx.top_exodus[0];
  const magnetTxt = topMagnet
    ? `magnet=${topMagnet.zone_label} (net=${topMagnet.net_flow})`
    : 'magnet=n/d';
  const exodusTxt = topExodus
    ? `exodus=${topExodus.zone_label} (net=${topExodus.net_flow})`
    : 'exodus=n/d';
  return `${magnetTxt}; ${exodusTxt}`;
}

function formatAlphaLifecycleLine(alpha: AlphaLifecycleSummary): string {
  const transitions = alpha.transitions_this_period.length;
  const caseCount = alpha.case_studies.length;
  return `transitions=${transitions} case_studies=${caseCount} counts=${JSON.stringify(
    alpha.counts_by_state,
  )}`;
}

function formatTopRankingsBlock(rankings: readonly ScorecardRankingSection[]): string {
  const targets = ['IPV', 'IAB', 'IDS'] as const;
  const lines: string[] = [];
  for (const code of targets) {
    const section = rankings.find((r) => r.index_code === code);
    if (!section) {
      lines.push(`  - ${code}: n/d`);
      continue;
    }
    const top3 = section.top_20
      .slice(0, 3)
      .map((e) => `${e.rank}. ${e.zone_label} (${e.value.toFixed(2)})`)
      .join(' | ');
    lines.push(`  - ${code}: ${top3}`);
  }
  return lines.join('\n');
}

function findTopZonePulse(pulse: PulseHeroMetric, zoneId: string): number | null {
  const match = pulse.top_zones.find((z) => z.zone_id === zoneId);
  if (match) return match.pulse;
  const bottomMatch = pulse.bottom_zones.find((z) => z.zone_id === zoneId);
  return bottomMatch ? bottomMatch.pulse : null;
}

function findAlphaStateForZone(alpha: AlphaLifecycleSummary, zoneId: string): string | null {
  const caseStudy = alpha.case_studies.find((c) => c.zone_id === zoneId);
  if (caseStudy) return caseStudy.current_state;
  const transition = alpha.transitions_this_period.find((t) => t.zone_id === zoneId);
  return transition ? transition.to_state : null;
}

function findRankForZone(
  rankings: readonly ScorecardRankingSection[],
  code: string,
  zoneId: string,
): number | null {
  const section = rankings.find((r) => r.index_code === code);
  if (!section) return null;
  const entry = section.top_20.find((e) => e.zone_id === zoneId);
  return entry ? entry.value : null;
}

function findMagnetExodusForZone(mx: MagnetExodusRanking, zoneId: string): string | null {
  const m = mx.top_magnets.find((r) => r.zone_id === zoneId);
  if (m) return `magnet rank=${m.rank} net=${m.net_flow}`;
  const e = mx.top_exodus.find((r) => r.zone_id === zoneId);
  if (e) return `exodus rank=${e.rank} net=${e.net_flow}`;
  return null;
}

function pickZoneStoryInputs(bundle: NarrativeBundleInput): readonly ZoneStoryInput[] {
  const out: ZoneStoryInput[] = [];
  const seen = new Set<string>();
  for (const timeline of bundle.top_timelines) {
    if (seen.has(timeline.zone_id)) continue;
    seen.add(timeline.zone_id);
    out.push({
      zone_id: timeline.zone_id,
      zone_label: timeline.zone_label,
      period_date: bundle.period_date,
    });
    if (out.length === 5) break;
  }
  return out;
}

function toMutableCitations(citations: readonly string[]): readonly string[] {
  return citations.slice();
}

// Public entry point.

export async function generateExecutiveNarrative(
  bundle: NarrativeBundleInput,
  causalHook: CausalHook,
): Promise<ExecutiveNarrative> {
  const summaryPrompt = formatExecutivePrompt(bundle);
  const summaryResult = await causalHook(summaryPrompt);

  const zoneInputs = pickZoneStoryInputs(bundle);
  const zoneResults = await Promise.all(
    zoneInputs.map(async (z) => {
      const prompt = formatZoneStoryPrompt(z.zone_id, z.zone_label, bundle);
      const result = await causalHook(prompt);
      return {
        zone_id: z.zone_id,
        zone_label: z.zone_label,
        story_md: result.text,
        citations: toMutableCitations(result.citations),
      };
    }),
  );

  return {
    country_code: bundle.country_code,
    period_date: bundle.period_date,
    summary_md: summaryResult.text,
    zone_stories: zoneResults.map((z) => ({
      zone_id: z.zone_id,
      zone_label: z.zone_label,
      story_md: z.story_md,
    })),
    generated_at: new Date().toISOString(),
  };
}

export type { CausalTimelineBundle, NarrativeBundleInput };
