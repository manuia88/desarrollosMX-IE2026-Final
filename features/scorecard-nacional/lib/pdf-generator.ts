// BLOQUE 11.I.1 — Scorecard Nacional PDF Generator
//
// Renderiza el reporte trimestral 40-80 páginas (portada + resumen ejecutivo +
// Pulse Hero + 15 rankings top-20 + sostenibilidad + magnet/exodus + alpha
// lifecycle + historias del trimestre + metodología + disclaimer) usando
// @react-pdf/renderer. Sube a Supabase Storage bucket `reports` con path
// `scorecard/<report_id>.pdf` y retorna URL pública + tamaño + duración.

import { Document, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type {
  AlphaLifecycleCaseStudy,
  CausalTimelineBundle,
  MagnetExodusRow,
  ScorecardBundle,
  ScorecardRankingEntry,
  ScorecardRankingSection,
  SustainabilityNationalSection,
} from '../types';

// ---------- Dopamine tokens (aproximados) ----------

const TOKENS = {
  primary: '#7c3aed',
  accent: '#f59e0b',
  text: '#1e293b',
  muted: '#64748b',
  subtle: '#e2e8f0',
  background: '#ffffff',
  danger: '#dc2626',
  positive: '#16a34a',
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    lineHeight: 1.45,
    fontFamily: 'Helvetica',
    color: TOKENS.text,
    backgroundColor: TOKENS.background,
  },
  coverPage: {
    padding: 56,
    fontFamily: 'Helvetica',
    color: TOKENS.text,
    backgroundColor: TOKENS.background,
    justifyContent: 'space-between',
  },
  coverBrand: {
    fontSize: 12,
    color: TOKENS.primary,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
  },
  coverTitle: {
    fontSize: 34,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 16,
    color: TOKENS.muted,
    marginBottom: 24,
  },
  coverFootnote: {
    fontSize: 9,
    color: TOKENS.muted,
  },
  disclaimerBadge: {
    fontSize: 10,
    color: TOKENS.accent,
    fontFamily: 'Helvetica-Bold',
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.primary,
    marginTop: 16,
    marginBottom: 10,
    borderBottom: `1 solid ${TOKENS.subtle}`,
    paddingBottom: 4,
  },
  subSection: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.text,
    marginTop: 14,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 8,
    color: TOKENS.text,
  },
  heroValue: {
    fontSize: 56,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.primary,
    marginTop: 18,
  },
  heroLabel: {
    fontSize: 12,
    color: TOKENS.muted,
    marginBottom: 4,
  },
  deltaPositive: {
    fontSize: 14,
    color: TOKENS.positive,
    fontFamily: 'Helvetica-Bold',
  },
  deltaNegative: {
    fontSize: 14,
    color: TOKENS.danger,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottom: `0.5 solid ${TOKENS.subtle}`,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottom: `1 solid ${TOKENS.primary}`,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.primary,
  },
  cellRank: { width: '10%' },
  cellZone: { width: '50%' },
  cellValue: { width: '20%', textAlign: 'right' },
  cellDelta: { width: '20%', textAlign: 'right' },
  cellTrend: { width: '15%' },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: TOKENS.muted,
    borderTop: `0.5 solid ${TOKENS.subtle}`,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

// ---------- Formatters ----------

function formatNumber(value: number | null, digits: number = 1): string {
  if (value === null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

function formatDelta(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

function formatDate(iso: string): string {
  // Formato es-MX DD/MM/YYYY
  const parts = iso.slice(0, 10).split('-');
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function trendLabel(trend: ScorecardRankingEntry['trend_direction']): string {
  if (trend === 'mejorando') return 'Subiendo';
  if (trend === 'empeorando') return 'Bajando';
  if (trend === 'estable') return 'Estable';
  return '—';
}

// ---------- Section builders ----------

interface FooterProps {
  readonly reportId: string;
  readonly generatedAt: string;
}

function renderFooter(props: FooterProps): ReactElement {
  return createElement(
    View,
    { style: styles.footer, fixed: true },
    createElement(Text, { key: 'l' }, `DMX Scorecard Nacional — ${props.reportId}`),
    createElement(Text, { key: 'r' }, `Generado ${formatDate(props.generatedAt)}`),
  );
}

function renderCover(bundle: ScorecardBundle): ReactElement {
  const periodLabel = describePeriod(bundle);
  return createElement(
    Page,
    { size: 'A4', style: styles.coverPage, key: 'cover' },
    createElement(
      View,
      { key: 'header' },
      createElement(Text, { style: styles.coverBrand }, 'DESARROLLOS MX'),
      createElement(Text, { style: styles.coverTitle }, `Scorecard Nacional ${periodLabel}`),
      createElement(
        Text,
        { style: styles.coverSubtitle },
        `País ${bundle.country_code} · ${formatDate(bundle.period_date)}`,
      ),
      createElement(
        Text,
        { style: styles.disclaimerBadge },
        'Preliminar — pendiente de validación',
      ),
    ),
    createElement(
      View,
      { key: 'footer' },
      createElement(
        Text,
        { style: styles.coverFootnote },
        `Metodología ${bundle.methodology_version} · Generado ${formatDate(bundle.generated_at)}`,
      ),
      createElement(
        Text,
        { style: styles.coverFootnote },
        'Fuentes: datos públicos agregados. No constituye recomendación de inversión.',
      ),
    ),
  );
}

function describePeriod(bundle: ScorecardBundle): string {
  const year = bundle.period_date.slice(0, 4);
  if (bundle.period_type === 'annual') return year;
  const monthNum = Number(bundle.period_date.slice(5, 7));
  if (bundle.period_type === 'quarterly') {
    const q = Math.floor((monthNum - 1) / 3) + 1;
    return `Q${q} ${year}`;
  }
  return `${String(monthNum).padStart(2, '0')}/${year}`;
}

function renderExecutiveSummary(bundle: ScorecardBundle): ReactElement {
  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'exec' },
    createElement(Text, { style: styles.sectionTitle }, 'Resumen ejecutivo'),
    ...bundle.executive_narrative.summary_md
      .split('\n\n')
      .filter((p) => p.trim().length > 0)
      .map((paragraph, idx) =>
        createElement(
          Text,
          { style: styles.paragraph, key: `p-${idx}` },
          paragraph.replace(/[#*`_]/g, '').trim(),
        ),
      ),
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

function renderPulseHero(bundle: ScorecardBundle): ReactElement {
  const pulse = bundle.pulse_hero;
  const deltaStyle =
    pulse.delta_vs_previous !== null && pulse.delta_vs_previous < 0
      ? styles.deltaNegative
      : styles.deltaPositive;

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'pulse' },
    createElement(Text, { style: styles.sectionTitle }, 'Pulse Nacional'),
    createElement(Text, { style: styles.heroLabel }, 'Pulso país (0 a 100)'),
    createElement(Text, { style: styles.heroValue }, formatNumber(pulse.pulse_national, 1)),
    createElement(
      Text,
      { style: deltaStyle },
      `Variación vs período previo: ${formatDelta(pulse.delta_vs_previous)}`,
    ),
    createElement(Text, { style: styles.subSection }, 'Top 5 zonas calientes'),
    ...pulse.top_zones
      .slice(0, 5)
      .map((zone, idx) =>
        createElement(
          View,
          { style: styles.tableRow, key: `top-${idx}` },
          createElement(Text, { style: styles.cellRank }, String(idx + 1)),
          createElement(Text, { style: styles.cellZone }, zone.zone_label),
          createElement(Text, { style: styles.cellValue }, formatNumber(zone.pulse, 1)),
          createElement(Text, { style: styles.cellDelta }, formatDelta(zone.delta)),
        ),
      ),
    createElement(Text, { style: styles.subSection }, 'Top 5 zonas frías'),
    ...pulse.bottom_zones
      .slice(0, 5)
      .map((zone, idx) =>
        createElement(
          View,
          { style: styles.tableRow, key: `bot-${idx}` },
          createElement(Text, { style: styles.cellRank }, String(idx + 1)),
          createElement(Text, { style: styles.cellZone }, zone.zone_label),
          createElement(Text, { style: styles.cellValue }, formatNumber(zone.pulse, 1)),
          createElement(Text, { style: styles.cellDelta }, formatDelta(zone.delta)),
        ),
      ),
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

function renderRankingPage(
  section: ScorecardRankingSection,
  bundle: ScorecardBundle,
): ReactElement {
  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `rank-${section.index_code}` },
    createElement(
      Text,
      { style: styles.sectionTitle },
      `Ranking ${section.index_code} · ${section.index_label}`,
    ),
    createElement(
      View,
      { style: styles.tableHeader, key: 'hdr' },
      createElement(Text, { style: styles.cellRank }, '#'),
      createElement(Text, { style: styles.cellZone }, 'Zona'),
      createElement(Text, { style: styles.cellValue }, 'Valor'),
      createElement(Text, { style: styles.cellDelta }, 'Variación'),
      createElement(Text, { style: styles.cellTrend }, 'Tendencia'),
    ),
    ...section.top_20.map((entry, idx) =>
      createElement(
        View,
        { style: styles.tableRow, key: `r-${idx}` },
        createElement(Text, { style: styles.cellRank }, String(entry.rank)),
        createElement(Text, { style: styles.cellZone }, entry.zone_label),
        createElement(Text, { style: styles.cellValue }, formatNumber(entry.value, 2)),
        createElement(Text, { style: styles.cellDelta }, formatDelta(entry.delta_vs_previous)),
        createElement(Text, { style: styles.cellTrend }, trendLabel(entry.trend_direction)),
      ),
    ),
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

function renderSustainability(
  section: SustainabilityNationalSection,
  bundle: ScorecardBundle,
): readonly ReactElement[] {
  const pages: ReactElement[] = [];

  pages.push(
    createElement(
      Page,
      { size: 'A4', style: styles.page, key: 'sust-overview' },
      createElement(Text, { style: styles.sectionTitle }, 'Sostenibilidad nacional'),
      createElement(
        Text,
        { style: styles.paragraph },
        `IDS nacional: ${formatNumber(section.ids_national, 1)} · IRE: ${formatNumber(section.ire_national, 1)} · IGV: ${formatNumber(section.igv_national, 1)} · GRN: ${formatNumber(section.grn_national, 1)}`,
      ),
      ...section.narrative_md
        .split('\n\n')
        .filter((p) => p.trim().length > 0)
        .map((p, idx) =>
          createElement(
            Text,
            { style: styles.paragraph, key: `s-${idx}` },
            p.replace(/[#*`_]/g, '').trim(),
          ),
        ),
      renderFooter({
        reportId: bundle.report_id,
        generatedAt: bundle.generated_at,
      }),
    ),
  );

  const triples: Array<{ label: string; rows: readonly ScorecardRankingEntry[] }> = [
    { label: 'Top 10 IDS (Desarrollo Sostenible)', rows: section.ranking_ids },
    { label: 'Top 10 IRE (Resiliencia)', rows: section.ranking_ire },
    { label: 'Top 10 GRN (Espacios Verdes)', rows: section.ranking_grn },
  ];

  for (const triple of triples) {
    pages.push(
      createElement(
        Page,
        { size: 'A4', style: styles.page, key: `sust-${triple.label}` },
        createElement(Text, { style: styles.sectionTitle }, triple.label),
        createElement(
          View,
          { style: styles.tableHeader, key: 'hdr' },
          createElement(Text, { style: styles.cellRank }, '#'),
          createElement(Text, { style: styles.cellZone }, 'Zona'),
          createElement(Text, { style: styles.cellValue }, 'Valor'),
          createElement(Text, { style: styles.cellDelta }, 'Variación'),
        ),
        ...triple.rows
          .slice(0, 10)
          .map((entry, idx) =>
            createElement(
              View,
              { style: styles.tableRow, key: `row-${idx}` },
              createElement(Text, { style: styles.cellRank }, String(entry.rank)),
              createElement(Text, { style: styles.cellZone }, entry.zone_label),
              createElement(Text, { style: styles.cellValue }, formatNumber(entry.value, 2)),
              createElement(
                Text,
                { style: styles.cellDelta },
                formatDelta(entry.delta_vs_previous),
              ),
            ),
          ),
        renderFooter({
          reportId: bundle.report_id,
          generatedAt: bundle.generated_at,
        }),
      ),
    );
  }

  return pages;
}

function renderMagnetExodus(bundle: ScorecardBundle): readonly ReactElement[] {
  const me = bundle.magnet_exodus;
  const pages: ReactElement[] = [];

  pages.push(
    createElement(
      Page,
      { size: 'A4', style: styles.page, key: 'me-narrative' },
      createElement(Text, { style: styles.sectionTitle }, 'Movilidad: Magnet vs Éxodo'),
      ...(me.prose_md ?? '')
        .split('\n\n')
        .filter((p) => p.trim().length > 0)
        .map((p, idx) =>
          createElement(
            Text,
            { style: styles.paragraph, key: `pn-${idx}` },
            p.replace(/[#*`_]/g, '').trim(),
          ),
        ),
      renderFooter({
        reportId: bundle.report_id,
        generatedAt: bundle.generated_at,
      }),
    ),
  );

  const renderMERows = (rows: readonly MagnetExodusRow[]): ReactElement[] =>
    rows
      .slice(0, 10)
      .map((row, idx) =>
        createElement(
          View,
          { style: styles.tableRow, key: `me-${row.zone_id}-${idx}` },
          createElement(Text, { style: styles.cellRank }, String(row.rank)),
          createElement(Text, { style: styles.cellZone }, row.zone_label),
          createElement(Text, { style: styles.cellValue }, formatNumber(row.net_flow, 0)),
          createElement(
            Text,
            { style: styles.cellDelta },
            `${(row.net_flow_pct * 100).toFixed(1)}%`,
          ),
        ),
      );

  pages.push(
    createElement(
      Page,
      { size: 'A4', style: styles.page, key: 'me-magnets' },
      createElement(
        Text,
        { style: styles.sectionTitle },
        'Top 10 Magnets — mayor flujo neto positivo',
      ),
      createElement(
        View,
        { style: styles.tableHeader, key: 'hdr' },
        createElement(Text, { style: styles.cellRank }, '#'),
        createElement(Text, { style: styles.cellZone }, 'Zona'),
        createElement(Text, { style: styles.cellValue }, 'Flujo neto'),
        createElement(Text, { style: styles.cellDelta }, '% neto'),
      ),
      ...renderMERows(me.top_magnets),
      renderFooter({
        reportId: bundle.report_id,
        generatedAt: bundle.generated_at,
      }),
    ),
  );

  pages.push(
    createElement(
      Page,
      { size: 'A4', style: styles.page, key: 'me-exodus' },
      createElement(
        Text,
        { style: styles.sectionTitle },
        'Top 10 Éxodo — mayor flujo neto negativo',
      ),
      createElement(
        View,
        { style: styles.tableHeader, key: 'hdr' },
        createElement(Text, { style: styles.cellRank }, '#'),
        createElement(Text, { style: styles.cellZone }, 'Zona'),
        createElement(Text, { style: styles.cellValue }, 'Flujo neto'),
        createElement(Text, { style: styles.cellDelta }, '% neto'),
      ),
      ...renderMERows(me.top_exodus),
      renderFooter({
        reportId: bundle.report_id,
        generatedAt: bundle.generated_at,
      }),
    ),
  );

  return pages;
}

function renderAlphaLifecycle(bundle: ScorecardBundle): readonly ReactElement[] {
  const al = bundle.alpha_lifecycle;
  const pages: ReactElement[] = [];

  const countsLine = (Object.keys(al.counts_by_state) as Array<keyof typeof al.counts_by_state>)
    .map((k) => `${k}: ${al.counts_by_state[k]}`)
    .join(' · ');

  pages.push(
    createElement(
      Page,
      { size: 'A4', style: styles.page, key: 'alpha-overview' },
      createElement(Text, { style: styles.sectionTitle }, 'Alpha Lifecycle'),
      createElement(Text, { style: styles.paragraph }, `Conteo por estado: ${countsLine}`),
      createElement(
        Text,
        { style: styles.subSection },
        `Transiciones detectadas (${al.transitions_this_period.length})`,
      ),
      ...al.transitions_this_period
        .slice(0, 20)
        .map((t, idx) =>
          createElement(
            View,
            { style: styles.tableRow, key: `t-${idx}` },
            createElement(Text, { style: styles.cellZone }, t.zone_label),
            createElement(
              Text,
              { style: styles.cellValue },
              `${t.from_state ?? '—'} → ${t.to_state}`,
            ),
            createElement(
              Text,
              { style: styles.cellDelta },
              formatNumber(t.alpha_score_at_transition, 1),
            ),
          ),
        ),
      renderFooter({
        reportId: bundle.report_id,
        generatedAt: bundle.generated_at,
      }),
    ),
  );

  for (const caseStudy of al.case_studies.slice(0, 3)) {
    pages.push(renderAlphaCaseStudy(caseStudy, bundle));
  }

  return pages;
}

function renderAlphaCaseStudy(
  caseStudy: AlphaLifecycleCaseStudy,
  bundle: ScorecardBundle,
): ReactElement {
  const timelineText = caseStudy.timeline
    .map(
      (t) =>
        `• ${formatDate(t.detected_at)} · ${t.from_state ?? 'inicio'} → ${t.to_state} (score ${formatNumber(t.alpha_score_at_transition, 1)})`,
    )
    .join('\n');

  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `cs-${caseStudy.zone_id}` },
    createElement(
      Text,
      { style: styles.sectionTitle },
      `Caso de estudio · ${caseStudy.zone_label}`,
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      `Estado actual: ${caseStudy.current_state} · ${caseStudy.years_in_state} años en estado`,
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      `Señales distintivas: ${caseStudy.signature_signals.join(', ') || '—'}`,
    ),
    createElement(Text, { style: styles.subSection }, 'Relato'),
    ...caseStudy.story_md
      .split('\n\n')
      .filter((p) => p.trim().length > 0)
      .map((p, idx) =>
        createElement(
          Text,
          { style: styles.paragraph, key: `cs-p-${idx}` },
          p.replace(/[#*`_]/g, '').trim(),
        ),
      ),
    createElement(Text, { style: styles.subSection }, 'Línea de tiempo'),
    createElement(Text, { style: styles.paragraph }, timelineText || '—'),
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

function renderTimelineStory(
  timeline: CausalTimelineBundle,
  bundle: ScorecardBundle,
): ReactElement {
  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: `tl-${timeline.zone_id}` },
    createElement(
      Text,
      { style: styles.sectionTitle },
      `Historia del trimestre · ${timeline.zone_label}`,
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      `${timeline.months_covered} meses cubiertos · País ${timeline.country_code}`,
    ),
    ...timeline.narrative_md
      .split('\n\n')
      .filter((p) => p.trim().length > 0)
      .map((p, idx) =>
        createElement(
          Text,
          { style: styles.paragraph, key: `tn-${idx}` },
          p.replace(/[#*`_]/g, '').trim(),
        ),
      ),
    timeline.alpha_journey_md
      ? createElement(
          View,
          { key: 'aj' },
          createElement(Text, { style: styles.subSection }, 'Trayectoria alpha'),
          createElement(
            Text,
            { style: styles.paragraph },
            timeline.alpha_journey_md.replace(/[#*`_]/g, '').trim(),
          ),
        )
      : null,
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

function renderMethodologyPage(bundle: ScorecardBundle): ReactElement {
  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'method' },
    createElement(Text, { style: styles.sectionTitle }, 'Metodología'),
    createElement(
      Text,
      { style: styles.paragraph },
      `Versión metodológica activa: ${bundle.methodology_version}.`,
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      'Detalle completo de fórmulas, pesos y fuentes en /metodologia. Cada índice cuenta con su propia ficha histórica versionada.',
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      'Los rankings se calculan con datos del período indicado. Variaciones se comparan contra el período inmediatamente anterior del mismo tipo (trimestral, mensual o anual).',
    ),
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

function renderDisclaimerPage(bundle: ScorecardBundle): ReactElement {
  return createElement(
    Page,
    { size: 'A4', style: styles.page, key: 'disclaimer' },
    createElement(Text, { style: styles.sectionTitle }, 'Aviso legal y fuentes'),
    createElement(
      Text,
      { style: styles.paragraph },
      'Este reporte NO constituye recomendación de inversión, asesoría financiera, inmobiliaria ni fiscal. No está registrado ante la CNBV ni ante la CONDUSEF.',
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      'La información proviene de fuentes públicas agregadas (INEGI, CONAPO, portales municipales, datos abiertos de movilidad y registros oficiales). DMX no garantiza completitud ni oportunidad absoluta.',
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      `Timestamp de cálculo: ${bundle.generated_at}. Reporte ID: ${bundle.report_id}.`,
    ),
    createElement(
      Text,
      { style: styles.paragraph },
      'Cualquier decisión de inversión debe validarse con un asesor profesional y due-diligence propia.',
    ),
    renderFooter({
      reportId: bundle.report_id,
      generatedAt: bundle.generated_at,
    }),
  );
}

// ---------- Document assembly ----------

const MAX_RANKINGS = 15;

function buildDocument(bundle: ScorecardBundle): ReactElement {
  const rankingsToRender = bundle.rankings.slice(0, MAX_RANKINGS);
  if (bundle.rankings.length > MAX_RANKINGS) {
    console.warn(
      `[scorecard pdf] bundle has ${bundle.rankings.length} rankings; rendering first ${MAX_RANKINGS} only`,
    );
  }

  const pages: ReactElement[] = [
    renderCover(bundle),
    renderExecutiveSummary(bundle),
    renderPulseHero(bundle),
    ...rankingsToRender.map((section) => renderRankingPage(section, bundle)),
    ...renderSustainability(bundle.sustainability, bundle),
    ...renderMagnetExodus(bundle),
    ...renderAlphaLifecycle(bundle),
    ...bundle.top_timelines.slice(0, 5).map((tl) => renderTimelineStory(tl, bundle)),
    renderMethodologyPage(bundle),
    renderDisclaimerPage(bundle),
  ];

  return createElement(Document, null, ...pages);
}

// ---------- Public API ----------

export interface GenerateScorecardPdfResult {
  readonly pdf_url: string;
  readonly bytes: number;
  readonly duration_ms: number;
}

export async function generateScorecardPdf(
  bundle: ScorecardBundle,
): Promise<GenerateScorecardPdfResult> {
  const startedAt = Date.now();

  const element = buildDocument(bundle);
  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

  const bytes = buffer.byteLength;
  const path = `scorecard/${bundle.report_id}.pdf`;

  let publicUrl = '';
  try {
    const admin = createAdminClient();
    const upload = await admin.storage.from('reports').upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (upload.error) {
      console.error('[scorecard pdf] upload error', upload.error);
    } else {
      const urlResult = admin.storage.from('reports').getPublicUrl(path);
      publicUrl = urlResult.data.publicUrl ?? '';
    }
  } catch (err) {
    console.error('[scorecard pdf] storage exception', err);
  }

  return {
    pdf_url: publicUrl,
    bytes,
    duration_ms: Date.now() - startedAt,
  };
}

// Exportado para consumo interno (press-kit reusa styles/tokens).
export const SCORECARD_PDF_TOKENS = TOKENS;
