import Anthropic from '@anthropic-ai/sdk';
import { sentry } from '@/shared/lib/telemetry/sentry';

const OPTIMIZER_MODEL = 'claude-sonnet-4-6';
const PAUSE_CPL_MULTIPLIER = 2;
const PAUSE_ROI_THRESHOLD = 1.5;
const SCALE_ROI_THRESHOLD = 3;
const OPTIMIZE_CTR_FLOOR = 0.005;

export type RecommendedAction = 'continue' | 'pause' | 'scale' | 'optimize';

export interface CampaignSnapshot {
  readonly campaignId: string;
  readonly campaignName: string;
  readonly channel: string;
  readonly spendMxn: number;
  readonly leads: number;
  readonly conversions: number;
  readonly revenueMxn: number;
  readonly impressions: number;
  readonly clicks: number;
}

export interface OptimizerVerdict {
  readonly campaignId: string;
  readonly action: RecommendedAction;
  readonly cplMxn: number | null;
  readonly cplRatio: number | null;
  readonly roi: number | null;
  readonly ctr: number | null;
  readonly reasoning: string;
}

export interface OptimizerInput {
  readonly campaigns: readonly CampaignSnapshot[];
  readonly mediaCplMxn: number | null;
}

export function evaluateCampaigns(input: OptimizerInput): readonly OptimizerVerdict[] {
  const validCpls = input.campaigns
    .filter((c) => c.leads > 0 && c.spendMxn > 0)
    .map((c) => c.spendMxn / c.leads);
  const mediaCpl = input.mediaCplMxn ?? median(validCpls);

  return input.campaigns.map((c) => evaluateOne(c, mediaCpl));
}

function evaluateOne(c: CampaignSnapshot, mediaCpl: number | null): OptimizerVerdict {
  const cplMxn = c.leads > 0 ? c.spendMxn / c.leads : null;
  const roi = c.spendMxn > 0 ? c.revenueMxn / c.spendMxn : null;
  const ctr = c.impressions > 0 ? c.clicks / c.impressions : null;
  const cplRatio = cplMxn !== null && mediaCpl && mediaCpl > 0 ? cplMxn / mediaCpl : null;

  let action: RecommendedAction = 'continue';
  const reasons: string[] = [];

  if (
    cplRatio !== null &&
    cplRatio > PAUSE_CPL_MULTIPLIER &&
    roi !== null &&
    roi < PAUSE_ROI_THRESHOLD
  ) {
    action = 'pause';
    reasons.push(
      `CPL ${cplRatio.toFixed(2)}x media + ROI ${roi.toFixed(2)}x debajo umbral ${PAUSE_ROI_THRESHOLD}`,
    );
  } else if (roi !== null && roi >= SCALE_ROI_THRESHOLD) {
    action = 'scale';
    reasons.push(
      `ROI ${roi.toFixed(2)}x supera umbral ${SCALE_ROI_THRESHOLD} — escalar presupuesto`,
    );
  } else if (ctr !== null && ctr < OPTIMIZE_CTR_FLOOR && c.impressions >= 1000) {
    action = 'optimize';
    reasons.push(`CTR ${(ctr * 100).toFixed(2)}% bajo piso — iterar creativos`);
  } else {
    reasons.push('Métricas dentro de rango — continuar monitoreando');
  }

  return {
    campaignId: c.campaignId,
    action,
    cplMxn,
    cplRatio,
    roi,
    ctr,
    reasoning: reasons.join('. '),
  };
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const left = sorted[mid - 1] ?? 0;
    const right = sorted[mid] ?? 0;
    return (left + right) / 2;
  }
  return sorted[mid] ?? 0;
}

export async function enrichWithClaudeReasoning(
  verdict: OptimizerVerdict,
  campaign: CampaignSnapshot,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return verdict.reasoning;
  try {
    const client = new Anthropic({ apiKey });
    const prompt = buildPrompt(verdict, campaign);
    const response = await client.messages.create({
      model: OPTIMIZER_MODEL,
      max_tokens: 280,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = response.content.find((b) => b.type === 'text');
    if (block && block.type === 'text') {
      const text = block.text.trim();
      if (text.length > 0) return text;
    }
  } catch (err) {
    sentry.captureException(err, { tags: { scope: 'ad-spend-optimizer' } });
  }
  return verdict.reasoning;
}

function buildPrompt(v: OptimizerVerdict, c: CampaignSnapshot): string {
  return [
    'Eres un analista de marketing inmobiliario LATAM. Resume en 2 frases (máx 280 chars) el racional para esta campaña.',
    `Campaña: ${c.campaignName} (canal ${c.channel})`,
    `Spend: $${c.spendMxn.toFixed(0)} MXN — Leads: ${c.leads} — Conversiones: ${c.conversions}`,
    `CPL: ${v.cplMxn !== null ? `$${v.cplMxn.toFixed(0)}` : 'n/d'} — ROI: ${v.roi !== null ? v.roi.toFixed(2) : 'n/d'}x — CTR: ${v.ctr !== null ? `${(v.ctr * 100).toFixed(2)}%` : 'n/d'}`,
    `Acción recomendada: ${v.action}`,
    `Heurística base: ${v.reasoning}`,
    'Devuelve SOLO el racional accionable, sin saludos, sin formato Markdown.',
  ].join('\n');
}

export const OPTIMIZER_THRESHOLDS = {
  PAUSE_CPL_MULTIPLIER,
  PAUSE_ROI_THRESHOLD,
  SCALE_ROI_THRESHOLD,
  OPTIMIZE_CTR_FLOOR,
} as const;
