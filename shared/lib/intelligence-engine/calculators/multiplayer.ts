// L-31 FASE 10 SESIÓN 2/3 — Multiplayer Mode para A08 Comparador.
//
// A08 es el score más natural para multiplayer: decisión pareja/familia
// comparando 5 propiedades. Backend infra en sesión 2/3; UI full en FASE 20.
//
// Helper: computeMultiplayerConsensus(per_user_scores) → {consensus, disagreement_dimensions}.
// Consensus: mean per dimension con penalty por disagreement (stddev). Si stddev > 25
// puntos, disagreement_dimensions incluye la dimensión con nota contextual.
//
// Realtime subscription skeleton: exporta Supabase channel helper para live updates
// cuando cualquier user cambia preferences. UI consume en FASE 20.

import type { SupabaseClient } from '@supabase/supabase-js';

export type PerUserScores = Readonly<Record<string, Readonly<Record<string, number>>>>;

export interface MultiplayerConsensus {
  readonly score: number; // 0-100 agregado
  readonly per_dimension_mean: Readonly<Record<string, number>>;
  readonly per_dimension_stddev: Readonly<Record<string, number>>;
  readonly disagreement_dimensions: readonly DisagreementEntry[];
  readonly agreement_level: 'alto' | 'medio' | 'bajo';
}

export interface DisagreementEntry {
  readonly dimension: string;
  readonly stddev: number;
  readonly min_user: { readonly userId: string; readonly value: number };
  readonly max_user: { readonly userId: string; readonly value: number };
}

const DISAGREEMENT_STDDEV_THRESHOLD = 25;
const AGREEMENT_THRESHOLDS = {
  alto: 10,
  medio: 20,
} as const;

export function computeMultiplayerConsensus(perUserScores: PerUserScores): MultiplayerConsensus {
  const userIds = Object.keys(perUserScores);
  if (userIds.length === 0) {
    return {
      score: 0,
      per_dimension_mean: {},
      per_dimension_stddev: {},
      disagreement_dimensions: [],
      agreement_level: 'bajo',
    };
  }

  const dimensions = new Set<string>();
  for (const uid of userIds) {
    const dims = perUserScores[uid];
    if (dims) for (const d of Object.keys(dims)) dimensions.add(d);
  }

  const per_dimension_mean: Record<string, number> = {};
  const per_dimension_stddev: Record<string, number> = {};
  const disagreement_dimensions: DisagreementEntry[] = [];

  for (const dim of dimensions) {
    const values: Array<{ userId: string; value: number }> = [];
    for (const uid of userIds) {
      const v = perUserScores[uid]?.[dim];
      if (typeof v === 'number' && Number.isFinite(v)) values.push({ userId: uid, value: v });
    }
    if (values.length === 0) continue;
    const mean = values.reduce((s, x) => s + x.value, 0) / values.length;
    const variance = values.reduce((s, x) => s + (x.value - mean) ** 2, 0) / values.length;
    const stddev = Math.sqrt(variance);
    per_dimension_mean[dim] = Number(mean.toFixed(2));
    per_dimension_stddev[dim] = Number(stddev.toFixed(2));

    if (stddev > DISAGREEMENT_STDDEV_THRESHOLD && values.length > 1) {
      const sorted = [...values].sort((a, b) => a.value - b.value);
      const min_user = sorted[0];
      const max_user = sorted[sorted.length - 1];
      if (min_user && max_user) {
        disagreement_dimensions.push({
          dimension: dim,
          stddev: Number(stddev.toFixed(2)),
          min_user,
          max_user,
        });
      }
    }
  }

  const dimMeans = Object.values(per_dimension_mean);
  const dimStddevs = Object.values(per_dimension_stddev);
  const score =
    dimMeans.length > 0
      ? Number((dimMeans.reduce((s, v) => s + v, 0) / dimMeans.length).toFixed(2))
      : 0;
  const avgStddev =
    dimStddevs.length > 0 ? dimStddevs.reduce((s, v) => s + v, 0) / dimStddevs.length : 0;

  let agreement_level: 'alto' | 'medio' | 'bajo' = 'bajo';
  if (avgStddev <= AGREEMENT_THRESHOLDS.alto) agreement_level = 'alto';
  else if (avgStddev <= AGREEMENT_THRESHOLDS.medio) agreement_level = 'medio';

  return {
    score,
    per_dimension_mean,
    per_dimension_stddev,
    disagreement_dimensions,
    agreement_level,
  };
}

// Realtime channel skeleton — UI FASE 20 consumirá. Backend solo expone nombre
// canónico y helper de suscripción.
export const MULTIPLAYER_CHANNEL_PREFIX = 'a08-multiplayer';

export function getMultiplayerChannelName(sessionId: string): string {
  return `${MULTIPLAYER_CHANNEL_PREFIX}:${sessionId}`;
}

// STUB — activar FASE 20 con [Supabase Realtime wire UI comparer]. Devuelve
// subscription skeleton que el server/client usa para broadcast preference
// changes.
export function subscribeMultiplayer(
  supabase: SupabaseClient,
  sessionId: string,
  onUpdate: (payload: Readonly<Record<string, unknown>>) => void,
): { unsubscribe: () => Promise<void> } {
  const channelName = getMultiplayerChannelName(sessionId);
  const channel = (
    supabase as unknown as {
      channel: (name: string) => {
        on: (
          event: string,
          filter: Readonly<Record<string, unknown>>,
          cb: (payload: Readonly<Record<string, unknown>>) => void,
        ) => {
          subscribe: () => unknown;
        };
      };
    }
  ).channel(channelName);

  const sub = channel.on('broadcast', { event: 'preference_updated' }, onUpdate).subscribe();

  return {
    unsubscribe: async () => {
      try {
        await (sub as unknown as { unsubscribe?: () => Promise<void> }).unsubscribe?.();
      } catch {
        // best-effort
      }
    },
  };
}
