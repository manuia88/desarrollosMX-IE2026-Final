// BLOQUE 11.I.2 — Scorecard Nacional Press Kit Generator
//
// Genera el press kit auto para cada Scorecard:
//   - release_md : comunicado 1-página en español (deterministic desde bundle)
//   - release_pdf_url : el mismo release renderizado a PDF vía @react-pdf
//   - quotes : 3 quotes (atribuciones fijas) producidas por un narrativeHook
//     inyectable (para permitir mock en tests y LLM en producción)
//   - charts : 5 PNGs stub (H1 placeholder, FASE 22 Marketing reemplaza)
//   - published_url : ruta pública /press/scorecard-<id>

import { Document, Page, renderToBuffer, StyleSheet, Text } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { PressKitBundle, PressKitChart, PressKitQuote, ScorecardBundle } from '../types';
import { SCORECARD_PDF_TOKENS } from './pdf-generator';

// ---------- Constants ----------

const BUCKET = 'press-kit';

const CHART_SLUGS = [
  'pulse-national-trend',
  'top-magnets-ranking',
  'top-exodus-ranking',
  'alpha-lifecycle-sankey',
  'sustainability-ids-top10',
] as const;

const CHART_TITLES: Readonly<Record<(typeof CHART_SLUGS)[number], string>> = {
  'pulse-national-trend': 'Evolución del Pulso Nacional',
  'top-magnets-ranking': 'Top Zonas Magnet',
  'top-exodus-ranking': 'Top Zonas en Éxodo',
  'alpha-lifecycle-sankey': 'Alpha Lifecycle — flujo de estados',
  'sustainability-ids-top10': 'Top 10 IDS (Desarrollo Sostenible)',
};

const QUOTE_ATTRIBUTIONS = [
  'Manuel Acosta — CEO DMX',
  'Dr. Analyst — Head of Research DMX',
  'Data Lead — Head of Data DMX',
] as const;

// ---------- Date helpers ----------

const MONTH_LABELS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

function describePeriodEs(bundle: ScorecardBundle): string {
  const year = bundle.period_date.slice(0, 4);
  const monthNum = Number(bundle.period_date.slice(5, 7));
  if (bundle.period_type === 'annual') return `anual ${year}`;
  if (bundle.period_type === 'quarterly') {
    const q = Math.floor((monthNum - 1) / 3) + 1;
    return `del Q${q} ${year}`;
  }
  const monthLabel = MONTH_LABELS_ES[monthNum - 1] ?? '';
  return `de ${monthLabel} ${year}`;
}

function formatDateEs(iso: string): string {
  const parts = iso.slice(0, 10).split('-');
  const [y, m, d] = parts;
  if (!y || !m || !d) return iso;
  const monthLabel = MONTH_LABELS_ES[Number(m) - 1] ?? m;
  return `${Number(d)} de ${monthLabel} de ${y}`;
}

// ---------- Release markdown (deterministic) ----------

export function renderReleaseMd(bundle: ScorecardBundle): string {
  const period = describePeriodEs(bundle);
  const dateLabel = formatDateEs(bundle.generated_at);

  const pulseValue = bundle.pulse_hero.pulse_national.toFixed(1);
  const pulseDelta = bundle.pulse_hero.delta_vs_previous;
  const deltaPhrase =
    pulseDelta === null
      ? 'sin comparativo disponible'
      : pulseDelta >= 0
        ? `+${pulseDelta.toFixed(2)} puntos vs período anterior`
        : `${pulseDelta.toFixed(2)} puntos vs período anterior`;

  const topMagnet = bundle.magnet_exodus.top_magnets[0];
  const topExodus = bundle.magnet_exodus.top_exodus[0];
  const alphaEmerging =
    bundle.alpha_lifecycle.case_studies.find((c) => c.current_state === 'emerging') ??
    bundle.alpha_lifecycle.case_studies[0];

  const headline = `DMX publica Scorecard Nacional ${period}: pulso país en ${pulseValue} (${deltaPhrase})`;

  const opener = `DMX, la plataforma de inteligencia inmobiliaria de México, publica hoy su Scorecard Nacional ${period} con el reporte definitivo del ecosistema: 15 rankings top-20, análisis de movilidad magnet vs éxodo, monitoreo de zonas alfa y sostenibilidad. El pulso nacional cerró en ${pulseValue} (${deltaPhrase}).`;

  const mobilityLine =
    topMagnet && topExodus
      ? `En movilidad, ${topMagnet.zone_label} encabeza las zonas magnet con flujo neto positivo de ${topMagnet.net_flow.toFixed(0)}, mientras que ${topExodus.zone_label} lidera el éxodo con flujo neto negativo de ${topExodus.net_flow.toFixed(0)}.`
      : 'En movilidad, el reporte detalla el ranking nacional de zonas magnet y éxodo del período.';

  const alphaLine = alphaEmerging
    ? `En el radar alpha, ${alphaEmerging.zone_label} se consolida como caso destacado (estado ${alphaEmerging.current_state}, ${alphaEmerging.years_in_state} años). Señales distintivas: ${alphaEmerging.signature_signals.slice(0, 3).join(', ') || 'mix temprano de consumo'}.`
    : 'El reporte incluye casos de estudio detallados del lifecycle alpha del período.';

  const ctaLine = `El Scorecard completo y el press kit están disponibles en desarrollos.mx/scorecard-nacional. Reporte ID ${bundle.report_id} — generado el ${dateLabel}.`;

  return [
    `# ${headline}`,
    '',
    `*${dateLabel} — Ciudad de México*`,
    '',
    opener,
    '',
    mobilityLine,
    '',
    alphaLine,
    '',
    ctaLine,
    '',
    '---',
    '',
    'Contacto prensa: prensa@desarrollos.mx',
  ].join('\n');
}

// ---------- Release PDF rendering ----------

const releaseStyles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: 'Helvetica',
    color: SCORECARD_PDF_TOKENS.text,
  },
  brand: {
    fontSize: 11,
    color: SCORECARD_PDF_TOKENS.primary,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    marginBottom: 10,
  },
  headline: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: SCORECARD_PDF_TOKENS.text,
    marginBottom: 12,
  },
  meta: {
    fontSize: 10,
    color: SCORECARD_PDF_TOKENS.muted,
    marginBottom: 18,
  },
  paragraph: {
    marginBottom: 10,
  },
  contact: {
    fontSize: 9,
    color: SCORECARD_PDF_TOKENS.muted,
    marginTop: 20,
    borderTop: `0.5 solid ${SCORECARD_PDF_TOKENS.subtle}`,
    paddingTop: 8,
  },
});

function buildReleaseDocument(releaseMd: string): ReactElement {
  const lines = releaseMd.split('\n');
  const headlineLine = lines.find((l) => l.startsWith('# '))?.replace(/^#\s+/, '') ?? '';
  const metaLine =
    lines.find((l) => l.startsWith('*') && l.endsWith('*'))?.replace(/\*/g, '') ?? '';

  const bodyStart = lines.findIndex(
    (l, idx) => idx > 1 && !l.startsWith('#') && !l.startsWith('*') && l.trim().length > 0,
  );
  const bodyLines = bodyStart >= 0 ? lines.slice(bodyStart) : [];
  const paragraphs = bodyLines
    .join('\n')
    .split('\n\n')
    .map((p) => p.replace(/[#*`_]/g, '').trim())
    .filter((p) => p.length > 0 && !p.startsWith('---'));

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: releaseStyles.page },
      createElement(Text, { style: releaseStyles.brand }, 'DESARROLLOS MX — COMUNICADO'),
      createElement(Text, { style: releaseStyles.headline }, headlineLine),
      createElement(Text, { style: releaseStyles.meta }, metaLine),
      ...paragraphs.map((p, idx) =>
        createElement(Text, { style: releaseStyles.paragraph, key: `rp-${idx}` }, p),
      ),
      createElement(
        Text,
        { style: releaseStyles.contact },
        'Contacto prensa: prensa@desarrollos.mx',
      ),
    ),
  );
}

// ---------- Stub PNG (1x1 transparent) ----------
//
// H1: PNG generation stub — FASE 22 Marketing reemplaza con chart renderer real
// (headless chart-to-PNG). Este buffer es un PNG válido de 1 pixel transparente
// suficiente para smoke tests + pipeline.

const STUB_PNG_BYTES = Uint8Array.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // signature
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1f,
  0x15,
  0xc4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9c,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0d,
  0x0a,
  0x2d,
  0xb4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4e,
  0x44,
  0xae,
  0x42,
  0x60,
  0x82,
]);

function stubChartPng(): Buffer {
  return Buffer.from(STUB_PNG_BYTES);
}

// ---------- Storage helpers ----------

interface UploadArgs {
  readonly path: string;
  readonly buffer: Buffer;
  readonly contentType: string;
}

async function uploadToPressKit(args: UploadArgs): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const upload = await admin.storage.from(BUCKET).upload(args.path, args.buffer, {
      contentType: args.contentType,
      upsert: true,
    });
    if (upload.error) {
      console.error('[press-kit] upload error', args.path, upload.error);
      return null;
    }
    const urlResult = admin.storage.from(BUCKET).getPublicUrl(args.path);
    return urlResult.data.publicUrl ?? null;
  } catch (err) {
    console.error('[press-kit] upload exception', args.path, err);
    return null;
  }
}

// ---------- Quote generation ----------

export type PressKitNarrativeHook = (prompt: string) => Promise<string>;

function buildQuotePrompts(bundle: ScorecardBundle): readonly string[] {
  const period = describePeriodEs(bundle);
  const pulseValue = bundle.pulse_hero.pulse_national.toFixed(1);
  const topMagnet = bundle.magnet_exodus.top_magnets[0]?.zone_label ?? 'la zona líder';

  return [
    `Genera una quote (máximo 2 oraciones, español natural) desde la perspectiva del CEO de DMX sobre la visión de producto y el impacto del Scorecard Nacional ${period}. Pulso nacional ${pulseValue}. Tono inspiracional, conciso.`,
    `Genera una quote (máximo 2 oraciones, español natural) desde la perspectiva del Head of Research de DMX sobre las dinámicas de mercado observadas en el Scorecard ${period}. Destaca la zona magnet líder (${topMagnet}). Tono analítico pero accesible.`,
    `Genera una quote (máximo 2 oraciones, español natural) desde la perspectiva del Head of Data de DMX sobre el rigor metodológico detrás del Scorecard Nacional ${period}. Menciona que se basa en fuentes públicas agregadas y metodología versionada. Tono técnico pero humano.`,
  ];
}

async function buildQuotes(
  bundle: ScorecardBundle,
  narrativeHook: PressKitNarrativeHook,
): Promise<readonly PressKitQuote[]> {
  const prompts = buildQuotePrompts(bundle);
  const quotes: PressKitQuote[] = [];

  const ceoQuote = await narrativeHook(prompts[0] ?? '');
  const researchQuote = await narrativeHook(prompts[1] ?? '');
  const dataQuote = await narrativeHook(prompts[2] ?? '');

  const rawQuotes = [ceoQuote, researchQuote, dataQuote];

  for (let i = 0; i < 3; i += 1) {
    const attribution = QUOTE_ATTRIBUTIONS[i];
    const raw = rawQuotes[i];
    if (attribution === undefined) continue;
    quotes.push({
      attribution,
      quote_md: (raw ?? '').trim() || 'Cita pendiente.',
    });
  }

  return quotes;
}

// ---------- Chart generation ----------

async function buildCharts(reportId: string): Promise<readonly PressKitChart[]> {
  const charts: PressKitChart[] = [];

  for (const slug of CHART_SLUGS) {
    const buffer = stubChartPng();
    const path = `${reportId}/${slug}.png`;
    const url = await uploadToPressKit({
      path,
      buffer,
      contentType: 'image/png',
    });
    charts.push({
      slug,
      title: CHART_TITLES[slug],
      png_url: url ?? '',
      width: 800,
      height: 500,
    });
  }

  return charts;
}

// ---------- Public API ----------

export async function generatePressKit(
  bundle: ScorecardBundle,
  narrativeHook: PressKitNarrativeHook,
): Promise<PressKitBundle> {
  const releaseMd = renderReleaseMd(bundle);

  let releasePdfUrl: string | null = null;
  try {
    const pdfBuffer = await renderToBuffer(
      buildReleaseDocument(releaseMd) as Parameters<typeof renderToBuffer>[0],
    );
    releasePdfUrl = await uploadToPressKit({
      path: `${bundle.report_id}/release.pdf`,
      buffer: pdfBuffer,
      contentType: 'application/pdf',
    });
  } catch (err) {
    console.error('[press-kit] release pdf generation failed', err);
    releasePdfUrl = null;
  }

  const quotes = await buildQuotes(bundle, narrativeHook);
  const charts = await buildCharts(bundle.report_id);

  const publishedUrl = `/press/scorecard-${bundle.report_id.toLowerCase()}`;

  return {
    report_id: bundle.report_id,
    country_code: bundle.country_code,
    period_date: bundle.period_date,
    release_md: releaseMd,
    release_pdf_url: releasePdfUrl,
    quotes,
    charts,
    published_url: publishedUrl,
    generated_at: new Date().toISOString(),
  };
}
