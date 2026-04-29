// 15.X.3 Committee Report — Investment Memo PDF
//
// Pipeline:
//   1) Sonnet orchestrator: thesis_summary + outline 8 secciones + citations base.
//   2) Haiku subsections: 8 calls paralelos para body de cada sección.
//   3) @react-pdf/renderer: 15-20 págs con cover + 8 sections + citations + disclaimer.
//   4) Upload bucket `reports` path `committee/<id>.pdf`.
//   5) INSERT committee_reports.
//
// Cost track ~$3-8 USD por reporte (Sonnet ~$0.20-0.40 + Haiku 8× ~$0.05-0.10).

import { Document, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createElement, type ReactElement } from 'react';
import { generateAI } from '@/shared/lib/ai/generate';
import type { Database } from '@/shared/types/database';

type AdminClient = SupabaseClient<Database>;

export const COMMITTEE_SECTIONS = [
  'executive_summary',
  'zone_deep_dive',
  'competitive_landscape',
  'demand_analysis',
  'pricing_strategy',
  'absorption_forecast',
  'financial_projections',
  'risk_assessment',
] as const;
export type CommitteeSectionKey = (typeof COMMITTEE_SECTIONS)[number];

export type CommitteeSection = {
  key: CommitteeSectionKey;
  title: string;
  body: string;
};

export type CommitteeCitation = {
  source: string;
  reference: string;
};

export type GenerateCommitteeInput = {
  userId: string;
  desarrolladoraId: string | null;
  proyectoId?: string;
  feasibilityId?: string;
  simulatorRunId?: string;
  thesisSummary: string;
};

export type GenerateCommitteeOutput = {
  reportId: string;
  pdfUrl: string | null;
  thesisSummary: string;
  sections: ReadonlyArray<CommitteeSection>;
  citations: ReadonlyArray<CommitteeCitation>;
  costUsd: number;
  durationMs: number;
};

const SECTION_TITLES_ES: Record<CommitteeSectionKey, string> = {
  executive_summary: 'Resumen Ejecutivo',
  zone_deep_dive: 'Análisis Profundo de Zona',
  competitive_landscape: 'Panorama Competitivo',
  demand_analysis: 'Análisis de Demanda',
  pricing_strategy: 'Estrategia de Precios',
  absorption_forecast: 'Pronóstico de Absorción',
  financial_projections: 'Proyecciones Financieras',
  risk_assessment: 'Evaluación de Riesgos',
};

const TOKENS = {
  primary: '#6366F1',
  accent: '#EC4899',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#e2e8f0',
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10.5,
    lineHeight: 1.5,
    fontFamily: 'Helvetica',
    color: TOKENS.text,
  },
  cover: {
    padding: 64,
    fontFamily: 'Helvetica',
    color: TOKENS.text,
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 11,
    color: TOKENS.primary,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    color: TOKENS.text,
  },
  thesis: {
    fontSize: 12,
    color: TOKENS.muted,
    marginTop: 16,
    lineHeight: 1.55,
  },
  sectionHeader: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.primary,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: TOKENS.primary,
    paddingBottom: 4,
  },
  sectionBody: {
    fontSize: 10.5,
    color: TOKENS.text,
    marginBottom: 6,
    textAlign: 'justify',
  },
  citationsTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: TOKENS.text,
    marginBottom: 6,
  },
  citationItem: {
    fontSize: 9.5,
    color: TOKENS.muted,
    marginBottom: 2,
  },
  disclaimer: {
    fontSize: 8.5,
    color: TOKENS.muted,
    marginTop: 24,
    fontStyle: 'italic',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 28,
    right: 56,
    fontSize: 9,
    color: TOKENS.muted,
  },
});

function buildDocument(args: {
  thesisSummary: string;
  sections: ReadonlyArray<CommitteeSection>;
  citations: ReadonlyArray<CommitteeCitation>;
  reportId: string;
  generatedAt: string;
}): ReactElement {
  const cover = createElement(
    Page,
    { size: 'LETTER', style: styles.cover, key: 'cover' },
    createElement(View, null, [
      createElement(Text, { style: styles.brand, key: 'brand' }, 'DMX · INVESTMENT COMMITTEE'),
      createElement(
        Text,
        { style: styles.coverTitle, key: 'title' },
        'Memo de Comité de Inversión',
      ),
      createElement(Text, { style: styles.thesis, key: 'thesis' }, args.thesisSummary),
    ]),
    createElement(
      View,
      { key: 'meta' },
      createElement(
        Text,
        { style: styles.disclaimer },
        `Reporte generado: ${args.generatedAt}\nReport ID: ${args.reportId}\n\nDocumento confidencial. Datos consolidados de fuentes públicas DMX (15 índices canónicos), sales pipeline interno y proyecciones financieras automatizadas. No constituye recomendación de inversión.`,
      ),
    ),
  );

  const sectionPages = args.sections.map((section, idx) =>
    createElement(
      Page,
      { size: 'LETTER', style: styles.page, key: `s-${idx}` },
      createElement(Text, { style: styles.sectionHeader }, section.title),
      createElement(Text, { style: styles.sectionBody }, section.body),
      createElement(Text, {
        style: styles.pageNumber,
        render: ({ pageNumber }) => `${pageNumber}`,
      }),
    ),
  );

  const citationsPage = createElement(
    Page,
    { size: 'LETTER', style: styles.page, key: 'citations' },
    createElement(Text, { style: styles.citationsTitle }, 'Fuentes y citas'),
    ...args.citations.map((c, idx) =>
      createElement(
        Text,
        { style: styles.citationItem, key: `c-${idx}` },
        `[${idx + 1}] ${c.source} — ${c.reference}`,
      ),
    ),
    createElement(Text, { style: styles.pageNumber, render: ({ pageNumber }) => `${pageNumber}` }),
  );

  return createElement(Document, null, cover, ...sectionPages, citationsPage);
}

async function orchestrate(
  thesisSummary: string,
  userId: string,
): Promise<{
  outline: ReadonlyArray<{ key: CommitteeSectionKey; brief: string }>;
  baseCitations: CommitteeCitation[];
  cost: number;
}> {
  const prompt = `Eres analista senior de inversión inmobiliaria. Diseña outline de un memo de comité (8 secciones fijas: ${COMMITTEE_SECTIONS.join(', ')}). Tesis del usuario: "${thesisSummary}". Para cada sección emite UN bullet (max 25 palabras) describiendo qué argumento construir. Responde JSON: { "outline": [{"key": "executive_summary", "brief": "..."}, ...], "citations": [{"source": "...", "reference": "..."}] }. NO añadas texto fuera del JSON.`;
  try {
    const res = await generateAI({
      category: 'financial',
      userId,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 1500,
    });
    const text = res.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('orchestrator no JSON');
    const parsed = JSON.parse(jsonMatch[0]) as {
      outline?: Array<{ key: string; brief: string }>;
      citations?: Array<{ source: string; reference: string }>;
    };
    const outline =
      parsed.outline?.filter((o): o is { key: CommitteeSectionKey; brief: string } =>
        COMMITTEE_SECTIONS.includes(o.key as CommitteeSectionKey),
      ) ?? [];
    const inputTokens = res.usage?.inputTokens ?? 0;
    const outputTokens = res.usage?.outputTokens ?? 0;
    const cost = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
    return {
      outline,
      baseCitations: parsed.citations ?? [],
      cost,
    };
  } catch {
    return {
      outline: COMMITTEE_SECTIONS.map((key) => ({
        key,
        brief: `${SECTION_TITLES_ES[key]} — análisis estructurado.`,
      })),
      baseCitations: [{ source: 'DMX 15 índices canónicos', reference: 'snapshot mensual' }],
      cost: 0,
    };
  }
}

async function generateSection(
  key: CommitteeSectionKey,
  brief: string,
  thesisSummary: string,
  userId: string,
): Promise<{ section: CommitteeSection; cost: number }> {
  const prompt = `Eres analista de inversión. Escribe la sección "${SECTION_TITLES_ES[key]}" de un memo de comité. Tesis principal: "${thesisSummary}". Brief: "${brief}". Tono ejecutivo, 4-6 párrafos cortos, datos concretos cuando sea pertinente. Responde solo el cuerpo en español MX.`;
  try {
    const res = await generateAI({
      category: 'haiku',
      userId,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 1200,
    });
    const inputTokens = res.usage?.inputTokens ?? 0;
    const outputTokens = res.usage?.outputTokens ?? 0;
    const cost = (inputTokens / 1_000_000) * 1 + (outputTokens / 1_000_000) * 5;
    return {
      section: {
        key,
        title: SECTION_TITLES_ES[key],
        body: res.text ?? `${SECTION_TITLES_ES[key]}: análisis pendiente de datos.`,
      },
      cost,
    };
  } catch {
    return {
      section: {
        key,
        title: SECTION_TITLES_ES[key],
        body: `${SECTION_TITLES_ES[key]}: análisis no disponible (placeholder).`,
      },
      cost: 0,
    };
  }
}

export async function generateCommitteeReport(
  supabase: AdminClient,
  input: GenerateCommitteeInput,
): Promise<GenerateCommitteeOutput> {
  const start = Date.now();

  const orchestration = await orchestrate(input.thesisSummary, input.userId);

  const sectionResults = await Promise.all(
    COMMITTEE_SECTIONS.map((key) => {
      const planned = orchestration.outline.find((o) => o.key === key);
      const brief = planned?.brief ?? `${SECTION_TITLES_ES[key]} — análisis estándar.`;
      return generateSection(key, brief, input.thesisSummary, input.userId);
    }),
  );

  const sections = sectionResults.map((r) => r.section);
  const subsectionCost = sectionResults.reduce((acc, r) => acc + r.cost, 0);
  const totalCost = orchestration.cost + subsectionCost;

  const citations: CommitteeCitation[] = [
    ...orchestration.baseCitations,
    { source: 'DMX simulator_runs', reference: input.simulatorRunId ?? 'n/a' },
    { source: 'DMX feasibility_reports', reference: input.feasibilityId ?? 'n/a' },
    { source: 'DMX proyectos pipeline', reference: input.proyectoId ?? 'n/a' },
  ];

  const insertPayload: Database['public']['Tables']['committee_reports']['Insert'] = {
    user_id: input.userId,
    desarrolladora_id: input.desarrolladoraId,
    proyecto_id: input.proyectoId ?? null,
    feasibility_id: input.feasibilityId ?? null,
    thesis_summary: input.thesisSummary,
    sections: sections.map((s) => ({ key: s.key, title: s.title, body: s.body })),
    citations,
    cost_usd: Number(totalCost.toFixed(4)),
    duration_ms: Date.now() - start,
  };

  const { data: inserted, error: insertErr } = await supabase
    .from('committee_reports')
    .insert(insertPayload)
    .select('id')
    .single();

  if (insertErr || !inserted) {
    throw new Error(`committee_reports insert failed: ${insertErr?.message ?? 'unknown'}`);
  }

  let pdfUrl: string | null = null;
  try {
    const generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const doc = buildDocument({
      thesisSummary: input.thesisSummary,
      sections,
      citations,
      reportId: inserted.id,
      generatedAt,
    });
    const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
    const path = `committee/${inserted.id}.pdf`;
    const upload = await supabase.storage.from('reports').upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });
    if (!upload.error) {
      const urlResult = supabase.storage.from('reports').getPublicUrl(path);
      pdfUrl = urlResult.data.publicUrl ?? null;
      if (pdfUrl) {
        await supabase.from('committee_reports').update({ pdf_url: pdfUrl }).eq('id', inserted.id);
      }
    }
  } catch (err) {
    console.error('[committee pdf] render/upload failed', err);
  }

  return {
    reportId: inserted.id,
    pdfUrl,
    thesisSummary: input.thesisSummary,
    sections,
    citations,
    costUsd: Number(totalCost.toFixed(4)),
    durationMs: Date.now() - start,
  };
}
