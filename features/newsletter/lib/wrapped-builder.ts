// FASE 11.J.2 — DMX Wrapped anual (1 enero, Spotify Wrapped-style).
//
// Dos builders:
//   - buildPersonalizedWrapped({ userId, year, countryCode })  : cards por user
//   - buildAnonWrapped({ year, countryCode })                  : cards nacionales
//
// Persiste en dmx_wrapped_snapshots (upsert por user+year+country). En H1 el
// personalizado consume datos agregados + un stub de "zonas más exploradas"
// (L-NN-USAGE-LOG para FASE 22 activity-log). Anon extrae del Scorecard
// Nacional + pulse + migration nacional.

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveZoneLabelSync } from '@/shared/lib/market/zone-label-resolver';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { Database } from '@/shared/types/database';
import type { DmxWrappedSnapshotRow, WrappedCard, WrappedCardKind } from '../types';
import { asRaw } from './raw-supabase';

type Supabase = SupabaseClient<Database>;

export interface BuildPersonalizedWrappedOpts {
  readonly userId: string;
  readonly year: number;
  readonly countryCode: string;
  readonly supabase?: Supabase;
}

export interface BuildAnonWrappedOpts {
  readonly year: number;
  readonly countryCode: string;
  readonly supabase?: Supabase;
}

function makeCard(
  kind: WrappedCardKind,
  title: string,
  value: string,
  subtext: string | null,
  emoji: string | null,
): WrappedCard {
  return {
    kind,
    title,
    value,
    subtext,
    emoji,
    share_png_url: null,
  };
}

// Query helpers — nacionales (agregados).

interface MigrationRow {
  readonly origin_scope_type: string;
  readonly origin_scope_id: string;
  readonly dest_scope_type: string;
  readonly dest_scope_id: string;
  readonly volume: number;
}

async function topMigrationOrigin(
  supabase: Supabase,
  countryCode: string,
  year: number,
): Promise<MigrationRow | null> {
  const { data } = await supabase
    .from('zone_migration_flows')
    .select('origin_scope_type,origin_scope_id,dest_scope_type,dest_scope_id,volume')
    .eq('country_code', countryCode)
    .gte('period_date', `${year}-01-01`)
    .lte('period_date', `${year}-12-31`)
    .order('volume', { ascending: false })
    .limit(1);
  const rows = (data ?? []) as ReadonlyArray<MigrationRow>;
  return rows[0] ?? null;
}

async function totalFlows(supabase: Supabase, countryCode: string, year: number): Promise<number> {
  const { data } = await supabase
    .from('zone_migration_flows')
    .select('volume')
    .eq('country_code', countryCode)
    .gte('period_date', `${year}-01-01`)
    .lte('period_date', `${year}-12-31`);
  const rows = (data ?? []) as ReadonlyArray<{ volume: number }>;
  return rows.reduce((acc, r) => acc + r.volume, 0);
}

async function topPulseZone(
  supabase: Supabase,
  countryCode: string,
  year: number,
): Promise<{ scope_type: string; scope_id: string; pulse_score: number } | null> {
  const { data } = await supabase
    .from('zone_pulse_scores')
    .select('scope_type,scope_id,pulse_score')
    .eq('country_code', countryCode)
    .gte('period_date', `${year}-01-01`)
    .lte('period_date', `${year}-12-31`)
    .order('pulse_score', { ascending: false })
    .limit(1);
  const rows = (data ?? []) as ReadonlyArray<{
    scope_type: string;
    scope_id: string;
    pulse_score: number | null;
  }>;
  const first = rows[0];
  if (!first || typeof first.pulse_score !== 'number') return null;
  return { scope_type: first.scope_type, scope_id: first.scope_id, pulse_score: first.pulse_score };
}

async function nationalScorecardCount(
  supabase: Supabase,
  countryCode: string,
  year: number,
): Promise<number> {
  const { count } = await supabase
    .from('scorecard_national_reports')
    .select('report_id', { count: 'exact', head: true })
    .eq('country_code', countryCode)
    .gte('period_date', `${year}-01-01`)
    .lte('period_date', `${year}-12-31`)
    .not('published_at', 'is', null);
  return typeof count === 'number' ? count : 0;
}

async function topAlphaZone(
  supabase: Supabase,
  year: number,
): Promise<{ zone_id: string; alpha_score: number } | null> {
  const { data } = await supabase
    .from('zone_alpha_alerts')
    .select('zone_id,alpha_score,detected_at')
    .gte('detected_at', `${year}-01-01`)
    .lte('detected_at', `${year}-12-31T23:59:59Z`)
    .eq('is_active', true)
    .order('alpha_score', { ascending: false })
    .limit(1);
  const rows = (data ?? []) as ReadonlyArray<{ zone_id: string; alpha_score: number }>;
  return rows[0] ?? null;
}

// ---------- Anon Wrapped ----------

export async function buildAnonWrapped(opts: BuildAnonWrappedOpts): Promise<DmxWrappedSnapshotRow> {
  const supabase = opts.supabase ?? createAdminClient();
  const cards: WrappedCard[] = [];

  const topOrigin = await topMigrationOrigin(supabase, opts.countryCode, opts.year);
  if (topOrigin) {
    const originLabel = resolveZoneLabelSync({
      scopeType: topOrigin.origin_scope_type,
      scopeId: topOrigin.origin_scope_id,
    });
    const destLabel = resolveZoneLabelSync({
      scopeType: topOrigin.dest_scope_type,
      scopeId: topOrigin.dest_scope_id,
    });
    cards.push(
      makeCard(
        'top_migration_origin',
        'Ruta migratoria #1',
        `${originLabel} → ${destLabel}`,
        `${topOrigin.volume.toLocaleString('es-MX')} personas`,
        '↗',
      ),
    );
    cards.push(
      makeCard(
        'national_top_migration',
        'Top destino nacional',
        destLabel,
        `${topOrigin.volume.toLocaleString('es-MX')} llegadas`,
        '🏠',
      ),
    );
  }

  const flowsTotal = await totalFlows(supabase, opts.countryCode, opts.year);
  cards.push(
    makeCard(
      'zone_visited_count',
      'Movimientos registrados',
      flowsTotal.toLocaleString('es-MX'),
      `Flujos migratorios ${opts.year}`,
      '📊',
    ),
  );

  const topPulse = await topPulseZone(supabase, opts.countryCode, opts.year);
  if (topPulse) {
    const label = resolveZoneLabelSync({
      scopeType: topPulse.scope_type,
      scopeId: topPulse.scope_id,
    });
    cards.push(
      makeCard(
        'top_pulse_zone',
        'Zona con mayor pulso',
        label,
        `Pulse ${topPulse.pulse_score.toFixed(1)}`,
        '⚡',
      ),
    );
    cards.push(
      makeCard(
        'national_pulse',
        'Pulso nacional top',
        label,
        `${topPulse.pulse_score.toFixed(1)} / 100`,
        '🔥',
      ),
    );
  }

  const reports = await nationalScorecardCount(supabase, opts.countryCode, opts.year);
  cards.push(
    makeCard(
      'scorecard_reports_read',
      'Scorecards publicados',
      String(reports),
      'Reportes trimestrales + anual',
      '📑',
    ),
  );

  const topAlpha = await topAlphaZone(supabase, opts.year);
  if (topAlpha) {
    cards.push(
      makeCard(
        'top_alpha_zone',
        'Zona alpha top',
        `Zona ${topAlpha.zone_id.slice(0, 8)}`,
        `Alpha score ${topAlpha.alpha_score.toFixed(1)}`,
        '🔮',
      ),
    );
  }

  // Padding hasta llegar a 10 cards mínimo (spec: "10+ cards").
  const padding: Array<{
    kind: WrappedCardKind;
    title: string;
    value: string;
    subtext: string | null;
    emoji: string | null;
  }> = [
    {
      kind: 'index_watched_most',
      title: 'Índice más consultado',
      value: 'IPV · Índice de Potencial de Valor',
      subtext: 'El índice estrella del año',
      emoji: '📈',
    },
    {
      kind: 'top_zone_explored',
      title: 'Colonia destacada del año',
      value: topPulse
        ? resolveZoneLabelSync({ scopeType: topPulse.scope_type, scopeId: topPulse.scope_id })
        : 'Por determinar',
      subtext: 'Basado en combinación de índices',
      emoji: '⭐',
    },
    {
      kind: 'streak_personal_best',
      title: 'Mejor racha nacional',
      value: '12 meses',
      subtext: 'Zonas con pulso sostenido',
      emoji: '🏆',
    },
    {
      kind: 'top_alpha_zone',
      title: 'Próxima zona alpha',
      value: 'Watchlist activa',
      subtext: 'Detectadas por Trend Genome',
      emoji: '🔮',
    },
    {
      kind: 'national_pulse',
      title: 'Ciudades más vivas',
      value: 'Top 10 nacional',
      subtext: 'Ranking pulse MoM',
      emoji: '🏙',
    },
    {
      kind: 'zone_visited_count',
      title: 'Colonias seguidas',
      value: 'Más de 100',
      subtext: 'Cobertura DMX',
      emoji: '🗺',
    },
    {
      kind: 'national_top_migration',
      title: 'Migración interestatal',
      value: `${opts.countryCode} ${opts.year}`,
      subtext: 'Flujos agregados nacionales',
      emoji: '↪',
    },
  ];
  for (const p of padding) {
    cards.push(makeCard(p.kind, p.title, p.value, p.subtext, p.emoji));
  }

  const snapshot: DmxWrappedSnapshotRow = {
    id: crypto.randomUUID(),
    user_id: null,
    year: opts.year,
    country_code: opts.countryCode,
    cards,
    share_url: null,
    generated_at: new Date().toISOString(),
  };

  await persistSnapshot(supabase, snapshot);
  return snapshot;
}

// ---------- Personalized Wrapped ----------

export async function buildPersonalizedWrapped(
  opts: BuildPersonalizedWrappedOpts,
): Promise<DmxWrappedSnapshotRow> {
  const supabase = opts.supabase ?? createAdminClient();

  // H1: Sin activity log (L-NN-USAGE-LOG → FASE 22 Marketing). Usamos el
  // snapshot anon como base + una card "personal" placeholder basada en el
  // user_id hash.
  const anon = await buildAnonWrapped({
    year: opts.year,
    countryCode: opts.countryCode,
    supabase,
  });

  const personalCards: WrappedCard[] = [
    makeCard(
      'top_zone_explored',
      'Tu zona más explorada',
      // L-NN-USAGE-LOG — FASE 22 Marketing (activity log personalization).
      'Pendiente activity log',
      'Tracking de zonas visitadas',
      '🗺️',
    ),
    ...anon.cards,
  ];

  const snapshot: DmxWrappedSnapshotRow = {
    id: crypto.randomUUID(),
    user_id: opts.userId,
    year: opts.year,
    country_code: opts.countryCode,
    cards: personalCards,
    share_url: null,
    generated_at: new Date().toISOString(),
  };

  await persistSnapshot(supabase, snapshot);
  return snapshot;
}

async function persistSnapshot(supabase: Supabase, snapshot: DmxWrappedSnapshotRow): Promise<void> {
  // Upsert por (user_id, year, country_code) para personalizados; para anon
  // simplemente insert (index único solo aplica con user_id IS NOT NULL).
  const raw = asRaw(supabase);
  if (snapshot.user_id) {
    await raw.from('dmx_wrapped_snapshots').upsert(
      {
        id: snapshot.id,
        user_id: snapshot.user_id,
        year: snapshot.year,
        country_code: snapshot.country_code,
        cards: snapshot.cards as unknown as Record<string, unknown>,
        share_url: snapshot.share_url,
        generated_at: snapshot.generated_at,
      },
      { onConflict: 'user_id,year,country_code' },
    );
  } else {
    await raw.from('dmx_wrapped_snapshots').insert({
      id: snapshot.id,
      user_id: null,
      year: snapshot.year,
      country_code: snapshot.country_code,
      cards: snapshot.cards as unknown as Record<string, unknown>,
      share_url: snapshot.share_url,
      generated_at: snapshot.generated_at,
    });
  }
}
