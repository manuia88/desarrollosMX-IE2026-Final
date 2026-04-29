import { TRPCError } from '@trpc/server';
import {
  upgBenchmarkInput,
  upgCompetitiveInput,
  upgDemandHeatmapInput,
  upgFeasibilityListInput,
  upgFeasibilityNewInput,
  upgManzanaInput,
  upgOportunidadInput,
  upgPricingAdvisorInput,
  upgProyeccionInput,
  upgTerrenosListInput,
} from '@/features/developer-upg/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { computeB07CompetitiveIntel } from '@/shared/lib/intelligence-engine/calculators/n1/b07-competitive-intel';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import {
  BENCHMARK_METRICS,
  type BenchmarkMetric,
  runBenchmarkEngine,
} from '@/shared/lib/upg/benchmark-engine';
import { runDemandHeatmapEngine } from '@/shared/lib/upg/demand-heatmap';
import { runFeasibilityEngine } from '@/shared/lib/upg/feasibility-engine';
import { runManzanaAnalyzer } from '@/shared/lib/upg/manzana-analyzer';
import { runOportunidadRanker } from '@/shared/lib/upg/oportunidad-ranker';
import { runPricingAdvisorEngine } from '@/shared/lib/upg/pricing-advisor';
import { type Proyeccion5yPhase, runProyeccion5y } from '@/shared/lib/upg/proyeccion-5y';

const ALLOWED_DEV_ROLES: ReadonlySet<string> = new Set([
  'admin_desarrolladora',
  'superadmin',
  'mb_admin',
]);

type AdminClient = ReturnType<typeof createAdminClient>;

async function ensureDevRole(
  supabase: AdminClient,
  userId: string,
): Promise<{ rol: string; desarrolladoraId: string | null }> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, desarrolladora_id')
    .eq('id', userId)
    .maybeSingle();
  if (!profile || !ALLOWED_DEV_ROLES.has(profile.rol)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'role_required_dev' });
  }
  return { rol: profile.rol, desarrolladoraId: profile.desarrolladora_id ?? null };
}

async function ensureProjectAccess(
  supabase: AdminClient,
  userId: string,
  proyectoId: string,
): Promise<void> {
  const { rol, desarrolladoraId } = await ensureDevRole(supabase, userId);
  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('id, desarrolladora_id')
    .eq('id', proyectoId)
    .maybeSingle();
  if (!proyecto) throw new TRPCError({ code: 'NOT_FOUND', message: 'proyecto_not_found' });
  if (rol === 'admin_desarrolladora' && proyecto.desarrolladora_id !== desarrolladoraId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'project_not_owned' });
  }
}

async function ensureDesarrolladoraAccess(
  supabase: AdminClient,
  userId: string,
  desarrolladoraId: string,
): Promise<void> {
  const { rol, desarrolladoraId: ownDevId } = await ensureDevRole(supabase, userId);
  if (rol === 'admin_desarrolladora' && ownDevId !== desarrolladoraId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'desarrolladora_not_owned' });
  }
}

function quarterToDateRange(quarter: string): { from: string; to: string } {
  const m = /^(\d{4})-Q([1-4])$/.exec(quarter);
  const year = m ? Number(m[1]) : new Date().getFullYear();
  const q = m ? Number(m[2]) : 1;
  const fromMonth = (q - 1) * 3;
  const toMonth = fromMonth + 3;
  const from = `${year}-${String(fromMonth + 1).padStart(2, '0')}-01`;
  const to =
    toMonth >= 12 ? `${year + 1}-01-01` : `${year}-${String(toMonth + 1).padStart(2, '0')}-01`;
  return { from, to };
}

async function computeDeveloperMetric(
  supabase: AdminClient,
  desarrolladoraId: string,
  metric: BenchmarkMetric,
  range: { from: string; to: string },
): Promise<number> {
  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, units_total, units_available, price_min_mxn, price_max_mxn, created_at')
    .eq('desarrolladora_id', desarrolladoraId)
    .eq('is_active', true);
  const list = proyectos ?? [];
  if (list.length === 0) return 0;

  if (metric === 'absorption_rate_monthly') {
    const sold = list.reduce(
      (acc, p) => acc + Math.max(0, (p.units_total ?? 0) - (p.units_available ?? 0)),
      0,
    );
    const months = Math.max(
      1,
      Math.round((Date.parse(range.to) - Date.parse(range.from)) / (1000 * 60 * 60 * 24 * 30.44)) *
        list.length,
    );
    return Number((sold / months).toFixed(4));
  }
  if (metric === 'price_per_m2_avg_mxn') {
    let acc = 0;
    let n = 0;
    for (const p of list) {
      const lo = Number(p.price_min_mxn ?? 0);
      const hi = Number(p.price_max_mxn ?? lo);
      if (lo > 0 && hi > 0) {
        acc += (lo + hi) / 2 / 80;
        n++;
      }
    }
    return n > 0 ? Number((acc / n).toFixed(2)) : 0;
  }
  if (metric === 'days_to_sell_avg') {
    const ages = list
      .map((p) => {
        const created = p.created_at ? Date.parse(p.created_at) : Date.now();
        const sold = (p.units_total ?? 0) - (p.units_available ?? 0);
        if (sold <= 0) return null;
        return (Date.now() - created) / (1000 * 60 * 60 * 24) / sold;
      })
      .filter((v): v is number => v !== null && Number.isFinite(v));
    if (ages.length === 0) return 0;
    const sum = ages.reduce((acc, v) => acc + v, 0);
    return Number((sum / ages.length).toFixed(2));
  }
  if (metric === 'units_delivered_on_time_pct') {
    const sold = list.reduce(
      (acc, p) => acc + Math.max(0, (p.units_total ?? 0) - (p.units_available ?? 0)),
      0,
    );
    const total = list.reduce((acc, p) => acc + (p.units_total ?? 0), 0);
    return total > 0 ? Number(((sold / total) * 100).toFixed(2)) : 0;
  }
  return 0;
}

export const developerUpgRouter = router({
  getDemandHeatmapReal: authenticatedProcedure
    .input(upgDemandHeatmapInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureProjectAccess(supabase, ctx.user.id, input.proyectoId);

      const since = new Date(Date.now() - input.daysWindow * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: busquedas }, { data: landingsRaw }, { data: proyecto }] = await Promise.all([
        supabase
          .from('busquedas')
          .select('id, status')
          .eq('status', 'active')
          .gte('created_at', since),
        supabase
          .from('landing_analytics')
          .select('event_type, created_at')
          .gte('created_at', since)
          .limit(2000),
        supabase
          .from('proyectos')
          .select('id, nombre, lat, lng')
          .eq('id', input.proyectoId)
          .maybeSingle(),
      ]);

      const busquedasRows = busquedas ?? [];
      const landingsRows = landingsRaw ?? [];
      const views = landingsRows.filter((r) => r.event_type === 'page_view').length;
      const wishlist = landingsRows.filter((r) => r.event_type === 'wishlist_add').length;
      const leads = landingsRows.filter((r) => r.event_type === 'lead_submit').length;
      const searches = busquedasRows.length;

      const result = runDemandHeatmapEngine({
        searchesCount: searches,
        wishlistCount: wishlist,
        viewsCount: views,
        leadsCount: leads,
        landingVisits: views,
        busquedasActivas: searches,
        daysWindow: input.daysWindow,
      });

      return {
        ...result,
        proyectoNombre: proyecto?.nombre ?? null,
        center:
          proyecto?.lat !== null && proyecto?.lng !== null && proyecto !== null
            ? { lat: Number(proyecto.lat), lng: Number(proyecto.lng) }
            : null,
        windowDays: input.daysWindow,
      };
    }),

  getPricingAdvisor: authenticatedProcedure
    .input(upgPricingAdvisorInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureProjectAccess(supabase, ctx.user.id, input.proyectoId);

      const { data: proyecto } = await supabase
        .from('proyectos')
        .select('id, nombre, colonia, country_code')
        .eq('id', input.proyectoId)
        .maybeSingle();

      const { data: unidades } = await supabase
        .from('unidades')
        .select('id, numero, status, price_mxn, area_m2, created_at')
        .eq('proyecto_id', input.proyectoId)
        .eq('status', 'disponible');

      const activeUnidades = (unidades ?? [])
        .filter((u) => u.price_mxn !== null && Number(u.price_mxn) > 0)
        .map((u) => {
          const created = u.created_at ? Date.parse(u.created_at) : Date.now();
          const dias = Math.max(0, Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)));
          return {
            unidadId: u.id,
            precioActual: Number(u.price_mxn),
            diasEnMercado: dias,
            absorcionMensual: 1.5,
          };
        });

      let precioPromedioM2Zona: number | null = null;
      let muestrasMercado = 0;
      if (proyecto?.colonia) {
        const { data: zoneMatch } = await supabase
          .from('zone_slugs')
          .select('zone_id')
          .eq('scope_type', 'colonia')
          .ilike('source_label', proyecto.colonia)
          .limit(1)
          .maybeSingle();
        if (zoneMatch?.zone_id) {
          const { data: market } = await supabase
            .from('market_prices_secondary')
            .select('price_minor, currency, area_built_m2')
            .eq('zone_id', zoneMatch.zone_id)
            .eq('operation', 'sale')
            .limit(50);
          const samples = (market ?? [])
            .map((m) => {
              const minor = Number(m.price_minor ?? 0);
              const area = Number(m.area_built_m2 ?? 0);
              if (minor <= 0 || area <= 0) return 0;
              return minor / 100 / area;
            })
            .filter((n) => Number.isFinite(n) && n > 0);
          muestrasMercado = samples.length;
          if (samples.length > 0) {
            precioPromedioM2Zona = samples.reduce((a, b) => a + b, 0) / samples.length;
          }
        }
      }

      const result = runPricingAdvisorEngine({
        projectId: input.proyectoId,
        unidades: activeUnidades,
        momentumZona: 65,
        demandaAlta: false,
        market: { precioPromedioM2Zona, muestrasMercado },
      });

      return {
        ...result,
        proyectoNombre: proyecto?.nombre ?? null,
        precioPromedioM2Zona,
        muestrasMercado,
      };
    }),

  getCompetitive: authenticatedProcedure
    .input(upgCompetitiveInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureProjectAccess(supabase, ctx.user.id, input.proyectoId);

      const { data: proyecto } = await supabase
        .from('proyectos')
        .select('id, nombre, country_code, ciudad, colonia, price_min_mxn, price_max_mxn')
        .eq('id', input.proyectoId)
        .maybeSingle();
      if (!proyecto) throw new TRPCError({ code: 'NOT_FOUND' });

      const { data: peers } = await supabase
        .from('proyectos')
        .select('id, nombre, price_min_mxn, price_max_mxn, units_total')
        .eq('country_code', proyecto.country_code)
        .neq('id', proyecto.id)
        .eq('is_active', true)
        .limit(5);

      const myAvg = ((proyecto.price_min_mxn ?? 0) + (proyecto.price_max_mxn ?? 0)) / 2;
      const myMetrics = {
        precio_m2: myAvg / 80,
        amenidades: 7,
        tamano: 80,
        absorcion: 1.7,
        marketing_spend: 55,
        dom: 55,
        quality: 70,
        momentum: 65,
      };

      const peersList = (peers ?? []).map((p) => {
        const avg = ((p.price_min_mxn ?? 0) + (p.price_max_mxn ?? 0)) / 2;
        return {
          project_id: p.id,
          precio_m2: avg / 80,
          amenidades: 6,
          tamano: 80,
          absorcion: 1.5,
          marketing_spend: 50,
          dom: 60,
          quality: 65,
          momentum: 60,
        };
      });

      const compute = computeB07CompetitiveIntel({
        my_project: {
          project_id: proyecto.id,
          ...myMetrics,
        },
        competitors: peersList,
      });

      return {
        score: compute.value,
        proyectoNombre: proyecto.nombre,
        myStrengths: compute.components.my_strengths,
        myWeaknesses: compute.components.my_weaknesses,
        competitorsCount: peersList.length,
        disclosure: peersList.length >= 5 ? 'observed' : 'mixed',
      };
    }),

  getBenchmark: authenticatedProcedure.input(upgBenchmarkInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    await ensureDesarrolladoraAccess(supabase, ctx.user.id, input.desarrolladoraId);
    const range = quarterToDateRange(input.periodQuarter);

    const { data: cached } = await supabase
      .from('developer_benchmarks')
      .select('metric, value, percentile, cohort_size, cohort_median, cohort_top10, cohort_top25')
      .eq('desarrolladora_id', input.desarrolladoraId)
      .eq('period_quarter', input.periodQuarter);

    if (cached && cached.length > 0) {
      return {
        desarrolladoraId: input.desarrolladoraId,
        periodQuarter: input.periodQuarter,
        metrics: cached.map((c) => ({
          metric: c.metric,
          value: Number(c.value),
          percentile: c.percentile,
          cohortSize: c.cohort_size,
          cohortMedian: Number(c.cohort_median ?? 0),
          cohortTop10: Number(c.cohort_top10 ?? 0),
          cohortTop25: Number(c.cohort_top25 ?? 0),
          disclosure: c.cohort_size >= 20 ? 'observed' : 'mixed',
        })),
        source: 'cached',
      };
    }

    const { data: cohort } = await supabase
      .from('desarrolladoras')
      .select('id')
      .eq('country_code', input.countryCode)
      .eq('is_active', true);
    const cohortIds = (cohort ?? []).map((d) => d.id);

    const metrics = [];
    for (const metric of BENCHMARK_METRICS) {
      const myValue = await computeDeveloperMetric(supabase, input.desarrolladoraId, metric, range);
      const cohortValues: { desarrolladoraId: string; value: number }[] = [];
      for (const id of cohortIds) {
        if (id === input.desarrolladoraId) continue;
        const v = await computeDeveloperMetric(supabase, id, metric, range);
        if (v > 0) cohortValues.push({ desarrolladoraId: id, value: v });
      }
      const result = runBenchmarkEngine({
        metric,
        value: myValue,
        cohort: cohortValues,
      });
      metrics.push(result);
    }

    return {
      desarrolladoraId: input.desarrolladoraId,
      periodQuarter: input.periodQuarter,
      metrics,
      source: 'live',
    };
  }),

  generateFeasibilityReport: authenticatedProcedure
    .input(upgFeasibilityNewInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { desarrolladoraId } = await ensureDevRole(supabase, ctx.user.id);

      const result = runFeasibilityEngine({
        tipo: input.programa.tipo,
        unitsTotal: input.programa.unitsTotal,
        precioPromedioMxn: input.programa.precioPromedioMxn,
        costoTotalEstimateMxn: input.programa.costoTotalEstimateMxn,
        constructionMonths: input.programa.constructionMonths,
        absorcionMensual: input.programa.absorcionMensual,
        discountRateAnnual: input.programa.discountRateAnnual,
        amortizacionTerrenoMensual: input.programa.amortizacionTerrenoMensual,
        gastosFijosMensuales: input.programa.gastosFijosMensuales,
      });

      const { data, error } = await supabase
        .from('feasibility_reports')
        .insert({
          desarrolladora_id: desarrolladoraId,
          user_id: ctx.user.id,
          catastro_link: input.catastroLink ?? null,
          geometry_geojson: JSON.parse(JSON.stringify(input.geometryGeojson ?? null)),
          programa_input: JSON.parse(JSON.stringify(input.programa)),
          cash_flow_5y: JSON.parse(JSON.stringify(result.cashFlow5y)),
          irr_5y: result.base.irr5y,
          irr_10y: result.base.irr10y,
          npv_mxn: result.base.npvMxn,
          break_even_month: result.base.breakEvenMonth,
          pmf_score: result.pmfScore,
          sensitivity_analysis: JSON.parse(JSON.stringify(result.sensitivity)),
          duration_ms: 0,
        })
        .select('id, created_at')
        .single();
      if (error) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }

      return {
        reportId: data.id,
        createdAt: data.created_at,
        ...result,
      };
    }),

  listFeasibility: authenticatedProcedure
    .input(upgFeasibilityListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const { rol, desarrolladoraId } = await ensureDevRole(supabase, ctx.user.id);
      const targetDevId =
        input.desarrolladoraId ?? (rol === 'admin_desarrolladora' ? desarrolladoraId : null);

      let q = supabase
        .from('feasibility_reports')
        .select('id, programa_input, irr_5y, npv_mxn, pmf_score, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (targetDevId) q = q.eq('desarrolladora_id', targetDevId);
      const { data, error } = await q;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  listLandingsTerrenos: authenticatedProcedure
    .input(upgTerrenosListInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevRole(supabase, ctx.user.id);

      const { data: landings } = await supabase
        .from('landings')
        .select('id, slug, title, country_code, meta, created_at')
        .eq('country_code', input.countryCode)
        .ilike('title', '%terreno%')
        .order('created_at', { ascending: false })
        .limit(input.limit);

      return {
        entries: landings ?? [],
        source: 'landings_search_fallback',
        notice: 'tabla_terrenos_pending_h2',
      };
    }),

  getManzanaAnalysis: authenticatedProcedure
    .input(upgManzanaInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevRole(supabase, ctx.user.id);

      let zoneId = input.coloniaId ?? null;
      if (!zoneId && input.lat !== undefined && input.lng !== undefined) {
        const { data: nearest } = await supabase
          .from('zone_slugs')
          .select('zone_id')
          .eq('scope_type', 'colonia')
          .limit(1)
          .maybeSingle();
        zoneId = nearest?.zone_id ?? null;
      }

      const scoresByType = {
        F01: null as number | null,
        F03: null as number | null,
        N01: null as number | null,
        F09: null as number | null,
        F10: null as number | null,
      };

      if (zoneId) {
        const { data: scores } = await supabase
          .from('zone_scores')
          .select('score_type, score_value')
          .eq('zone_id', zoneId)
          .in('score_type', ['F01', 'F03', 'N01', 'F09', 'F10'])
          .order('computed_at', { ascending: false });
        for (const s of scores ?? []) {
          const type = String(s.score_type).toUpperCase();
          const v = Number(s.score_value);
          if (type === 'F01' && scoresByType.F01 === null) scoresByType.F01 = v;
          if (type === 'F03' && scoresByType.F03 === null) scoresByType.F03 = v;
          if (type === 'N01' && scoresByType.N01 === null) scoresByType.N01 = v;
          if (type === 'F09' && scoresByType.F09 === null) scoresByType.F09 = v;
          if (type === 'F10' && scoresByType.F10 === null) scoresByType.F10 = v;
        }
      }

      const result = runManzanaAnalyzer({
        f01Safety: scoresByType.F01,
        f03Ecosystem: scoresByType.F03,
        n01Diversity: scoresByType.N01,
        f10Gentrification: scoresByType.F10,
        f09Value: scoresByType.F09,
      });

      return {
        ...result,
        zoneId,
        coordsProvided:
          input.lat !== undefined && input.lng !== undefined
            ? { lat: input.lat, lng: input.lng }
            : null,
      };
    }),

  getZonasOportunidad: authenticatedProcedure
    .input(upgOportunidadInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevRole(supabase, ctx.user.id);

      const { data: rows } = await supabase
        .from('ghost_zones_ranking')
        .select(
          'colonia_id, score_total, ghost_score, transition_probability, rank, search_volume, press_mentions',
        )
        .eq('country_code', input.countryCode)
        .order('rank', { ascending: true })
        .limit(input.limit);

      const ghostRows = (rows ?? []).map((r) => ({
        coloniaId: r.colonia_id,
        score: Number(r.score_total ?? 0),
        ghostScore: Number(r.ghost_score ?? 0),
        transitionProbability: Number(r.transition_probability ?? 0),
        rank: r.rank ?? 0,
        searchVolume: r.search_volume ?? 0,
        pressMentions: r.press_mentions ?? 0,
      }));

      const result = runOportunidadRanker({
        ghostRows,
        limit: input.limit,
      });

      return {
        ...result,
        countryCode: input.countryCode,
      };
    }),

  getProyeccion5Years: authenticatedProcedure
    .input(upgProyeccionInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      await ensureDevRole(supabase, ctx.user.id);

      const { data: scores } = await supabase
        .from('zone_scores')
        .select('score_type, score_value, components')
        .eq('zone_id', input.coloniaId)
        .in('score_type', ['F10', 'N03', 'N04']);

      let f10Score: number | null = null;
      let f10Phase: Proyeccion5yPhase | null = null;
      let n03: number | null = null;
      let n04: number | null = null;

      for (const s of scores ?? []) {
        const type = String(s.score_type).toUpperCase();
        const v = Number(s.score_value);
        if (type === 'F10') {
          f10Score = v;
          const components = (s.components ?? {}) as Record<string, unknown>;
          const fase = components.fase_gentrificacion;
          if (
            fase === 'inicial' ||
            fase === 'media' ||
            fase === 'tardia' ||
            fase === 'post_gentrificada' ||
            fase === 'desconocida'
          ) {
            f10Phase = fase;
          }
        }
        if (type === 'N03') n03 = v;
        if (type === 'N04') n04 = v;
      }

      const result = runProyeccion5y({
        f10Score,
        f10Phase,
        n03Velocity: n03,
        n04CrimeTrajectory: n04,
        priceIndex5yDeltaPct: null,
      });

      return {
        ...result,
        coloniaId: input.coloniaId,
      };
    }),
});
