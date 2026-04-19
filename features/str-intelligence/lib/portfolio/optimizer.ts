// Portfolio Optimizer — FASE 07b / BLOQUE 7b.M.
//
// Heurística greedy con constraints (no se introduce dep externa LP solver
// para mantener stack lean — ver ADR-019 §2 ; LP propio puede entrar en H3).
//
// Input: candidates con (price, expected_cap_rate, zone_id, risk).
// Constraints: budget_total, max_listings_per_zone, min_cap_rate, max_risk.
// Output: portfolio óptimo + efficient frontier (10 puntos sweeping risk).
//
// Greedy strategy:
//   1. Filtra candidates por min_cap_rate y max_risk.
//   2. Ordena por cap_rate desc.
//   3. Itera y agrega si: (a) cabe en budget, (b) zone no está saturada
//      por max_listings_per_zone.
//   4. Calcula efficient frontier sweeping max_risk en 10 puntos
//      [0.1..max_risk].

export interface PortfolioCandidate {
  readonly listing_id: string;
  readonly platform: 'airbnb' | 'vrbo' | 'booking';
  readonly zone_id: string | null;
  readonly market_id: string | null;
  readonly price_minor: number;
  readonly expected_cap_rate: number; // 0..1
  readonly expected_revenue_annual_minor: number;
  readonly risk_score: number; // 0..1 (higher = riskier)
}

export interface PortfolioConstraints {
  readonly budget_total_minor: number;
  readonly max_listings_per_zone: number;
  readonly min_cap_rate: number; // 0..1
  readonly max_risk: number; // 0..1
}

export interface PortfolioEntry {
  readonly listing_id: string;
  readonly platform: 'airbnb' | 'vrbo' | 'booking';
  readonly zone_id: string | null;
  readonly price_minor: number;
  readonly expected_cap_rate: number;
  readonly weight: number; // capital share (0..1)
}

export interface FrontierPoint {
  readonly max_risk: number;
  readonly portfolio_size: number;
  readonly total_invested_minor: number;
  readonly weighted_cap_rate: number;
  readonly diversification_score: number;
}

export interface PortfolioResult {
  readonly portfolio: readonly PortfolioEntry[];
  readonly total_invested_minor: number;
  readonly remaining_budget_minor: number;
  readonly weighted_cap_rate: number;
  readonly diversification_score: number; // 0..1 (higher = better)
  readonly zones_distinct: number;
  readonly efficient_frontier_points: readonly FrontierPoint[];
  readonly constraints_applied: PortfolioConstraints;
}

function pickPortfolioGreedy(
  candidates: readonly PortfolioCandidate[],
  constraints: PortfolioConstraints,
): readonly PortfolioCandidate[] {
  // Filter
  const eligible = candidates.filter(
    (c) =>
      c.expected_cap_rate >= constraints.min_cap_rate &&
      c.risk_score <= constraints.max_risk &&
      c.price_minor > 0,
  );
  // Sort by cap_rate desc.
  const sorted = [...eligible].sort((a, b) => b.expected_cap_rate - a.expected_cap_rate);

  const selected: PortfolioCandidate[] = [];
  const zoneCount = new Map<string, number>();
  let usedBudget = 0;
  for (const c of sorted) {
    if (usedBudget + c.price_minor > constraints.budget_total_minor) continue;
    const zoneKey = c.zone_id ?? '__no_zone__';
    const currentCount = zoneCount.get(zoneKey) ?? 0;
    if (currentCount >= constraints.max_listings_per_zone) continue;
    selected.push(c);
    usedBudget += c.price_minor;
    zoneCount.set(zoneKey, currentCount + 1);
  }
  return selected;
}

function diversificationScore(selected: readonly PortfolioCandidate[]): number {
  if (selected.length === 0) return 0;
  const zoneCount = new Map<string, number>();
  for (const c of selected) {
    const key = c.zone_id ?? '__no_zone__';
    zoneCount.set(key, (zoneCount.get(key) ?? 0) + 1);
  }
  // Herfindahl-style: 1 - sum(share^2). Higher = more diverse.
  const total = selected.length;
  let h = 0;
  for (const count of zoneCount.values()) {
    const share = count / total;
    h += share * share;
  }
  return Math.round((1 - h) * 1000) / 1000;
}

function weightedCapRate(selected: readonly PortfolioCandidate[]): number {
  if (selected.length === 0) return 0;
  const totalCapital = selected.reduce((sum, c) => sum + c.price_minor, 0);
  if (totalCapital === 0) return 0;
  let weightedSum = 0;
  for (const c of selected) {
    weightedSum += c.expected_cap_rate * (c.price_minor / totalCapital);
  }
  return Math.round(weightedSum * 10000) / 10000;
}

function buildEntries(selected: readonly PortfolioCandidate[]): PortfolioEntry[] {
  const totalCapital = selected.reduce((sum, c) => sum + c.price_minor, 0);
  return selected.map((c) => ({
    listing_id: c.listing_id,
    platform: c.platform,
    zone_id: c.zone_id,
    price_minor: c.price_minor,
    expected_cap_rate: c.expected_cap_rate,
    weight: totalCapital > 0 ? Math.round((c.price_minor / totalCapital) * 10000) / 10000 : 0,
  }));
}

export function optimizePortfolio(
  candidates: readonly PortfolioCandidate[],
  constraints: PortfolioConstraints,
): PortfolioResult {
  const selected = pickPortfolioGreedy(candidates, constraints);
  const entries = buildEntries(selected);
  const totalInvested = selected.reduce((sum, c) => sum + c.price_minor, 0);

  const distinctZones = new Set<string>();
  for (const c of selected) distinctZones.add(c.zone_id ?? '__no_zone__');

  // Efficient frontier sweeping max_risk en 10 puntos.
  const frontier: FrontierPoint[] = [];
  const startRisk = 0.1;
  const stepRisk = (constraints.max_risk - startRisk) / 9;
  for (let i = 0; i < 10; i += 1) {
    const risk = startRisk + i * stepRisk;
    const sweepConstraints: PortfolioConstraints = { ...constraints, max_risk: risk };
    const sweepSelected = pickPortfolioGreedy(candidates, sweepConstraints);
    frontier.push({
      max_risk: Math.round(risk * 1000) / 1000,
      portfolio_size: sweepSelected.length,
      total_invested_minor: sweepSelected.reduce((s, c) => s + c.price_minor, 0),
      weighted_cap_rate: weightedCapRate(sweepSelected),
      diversification_score: diversificationScore(sweepSelected),
    });
  }

  return {
    portfolio: entries,
    total_invested_minor: totalInvested,
    remaining_budget_minor: constraints.budget_total_minor - totalInvested,
    weighted_cap_rate: weightedCapRate(selected),
    diversification_score: diversificationScore(selected),
    zones_distinct: distinctZones.size,
    efficient_frontier_points: frontier,
    constraints_applied: constraints,
  };
}
