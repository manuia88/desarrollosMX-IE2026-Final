// FASE 14.1 — Dubai city expansion (ADR-059 §Step 4 Reelly integration STUB ADR-018).
// Reelly API response types — referencia api-reelly.up.railway.app/api/v2/clients.
// STUB H1: tipos definidos pero sin fetch real hasta REELLY_API_KEY configurado.

export type ReellyProjectStatus = 'off_plan' | 'ready' | 'completed' | 'under_construction';

export interface ReellyProject {
  readonly id: string;
  readonly project_name: string;
  readonly area: string;
  readonly developer_id: string;
  readonly country_code: 'AE';
  readonly status: ReellyProjectStatus;
  readonly price_min_usd: number;
  readonly price_max_usd: number;
  readonly currency_native: 'AED';
}

export interface ReellyDeveloper {
  readonly id: string;
  readonly name: string;
  readonly country: 'AE';
  readonly projects_count: number;
}

export interface ReellyMarker {
  readonly project_id: string;
  readonly lat: number;
  readonly lng: number;
  readonly label: string;
}

export interface ReellyCountry {
  readonly code: string;
  readonly name: string;
}

export interface ReellyRegion {
  readonly id: string;
  readonly name: string;
  readonly country_code: string;
}

export interface ReellyConnectionTest {
  readonly ok: boolean;
  readonly account_balance: number | null;
  readonly projects_available: number | null;
  readonly reason: ReellyNotImplementedReason | null;
}

export type ReellyNotImplementedReason =
  | 'REELLY_API_KEY missing'
  | 'flag DUBAI_REELLY_API_ENABLED disabled'
  | 'API quota exceeded';

export interface ReellyListProjectsFilters {
  readonly area?: string;
  readonly priceMinUsd?: number;
  readonly priceMaxUsd?: number;
}

export interface ReellySyncResult {
  readonly syncedCount: number;
  readonly errors: ReadonlyArray<string>;
}
