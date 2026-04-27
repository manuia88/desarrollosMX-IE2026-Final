// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.5 — Predictive 80% threshold warning.
// Idempotente: si ya existe row threshold_warning_sent=true en current period, retorna
// triggered=false. Si triggered: send Resend email (graceful degrade a Mock provider en CI/dev)
// + UPDATE studio_usage_logs.threshold_warning_sent=true en TODAS las rows current period
// para evitar duplicados (canon predictive warning, memoria upgrade DIRECTO).

import { createAdminClient } from '@/shared/lib/supabase/admin';
import { sentry } from '@/shared/lib/telemetry/sentry';
import { getStudioEmailProvider } from '../resend/provider';
import { checkUsageLimit, currentPeriodMonth } from './usage-tracker';

type AdminClient = ReturnType<typeof createAdminClient>;

const PREDICTIVE_THRESHOLD_PCT = 0.8;

export interface PredictiveWarningCheckInput {
  readonly userId: string;
}

export interface PredictiveWarningCheckResult {
  readonly triggered: boolean;
  readonly thresholdPct: number;
  readonly sentAt?: string | null;
}

function getClient(client?: AdminClient): AdminClient {
  return client ?? createAdminClient();
}

interface CheckOpts {
  readonly client?: AdminClient;
  readonly emailTo?: string | null;
}

export async function checkPredictiveWarning(
  input: PredictiveWarningCheckInput,
  opts?: CheckOpts,
): Promise<PredictiveWarningCheckResult> {
  const supabase = getClient(opts?.client);
  const period = currentPeriodMonth();

  const { data: existingFlagged } = await supabase
    .from('studio_usage_logs')
    .select('id')
    .eq('user_id', input.userId)
    .eq('period_month', period)
    .eq('threshold_warning_sent', true)
    .limit(1)
    .maybeSingle();

  if (existingFlagged) {
    return { triggered: false, thresholdPct: PREDICTIVE_THRESHOLD_PCT, sentAt: null };
  }

  const limitCheck = await checkUsageLimit(input.userId, { client: supabase });
  const usedPct = limitCheck.limit > 0 ? limitCheck.used / limitCheck.limit : 0;

  if (usedPct < PREDICTIVE_THRESHOLD_PCT) {
    return { triggered: false, thresholdPct: PREDICTIVE_THRESHOLD_PCT, sentAt: null };
  }

  let sentAt: string | null = null;

  if (opts?.emailTo) {
    try {
      const provider = getStudioEmailProvider();
      await provider.send({
        to: opts.emailTo,
        subject: 'Has usado 80% de tu cuota mensual',
        html: `<p>Has usado ${limitCheck.used} de ${limitCheck.limit} videos este mes.</p>`,
        tags: [
          { name: 'product', value: 'dmx-studio' },
          { name: 'studio_template', value: 'predictive_warning_80' },
        ],
      });
      sentAt = new Date().toISOString();
    } catch (err) {
      sentry.captureException(err, {
        tags: { feature: 'dmx-studio.usage', op: 'predictive_warning.send' },
        extra: { userId: input.userId, period },
      });
    }
  }

  const { error: updateError } = await supabase
    .from('studio_usage_logs')
    .update({ threshold_warning_sent: true })
    .eq('user_id', input.userId)
    .eq('period_month', period)
    .eq('threshold_warning_sent', false);

  if (updateError) {
    sentry.captureException(new Error(updateError.message), {
      tags: { feature: 'dmx-studio.usage', op: 'predictive_warning.update_flag' },
      extra: { userId: input.userId, period },
    });
  }

  return { triggered: true, thresholdPct: PREDICTIVE_THRESHOLD_PCT, sentAt };
}
