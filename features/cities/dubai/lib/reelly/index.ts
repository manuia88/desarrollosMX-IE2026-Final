// STUB ADR-018 — activar cuando REELLY_API_KEY configured (señal 1).
// FASE 14.1 — Dubai Reelly client (ADR-059 §Step 4).
// Singleton wrapper para api-reelly.up.railway.app/api/v2/clients.
// H1: throw TRPCError NOT_IMPLEMENTED si !apiKey || flag disabled (señal 4).
// H2: real fetch GET /projects?country=AE + filters tras activación.

import { TRPCError } from '@trpc/server';
import { DUBAI_FEATURE_FLAGS, isDubaiFlagEnabled } from '../../feature-flags';
import type {
  ReellyConnectionTest,
  ReellyListProjectsFilters,
  ReellyMarker,
  ReellyProject,
  ReellySyncResult,
} from './types';

export const REELLY_FEATURE_FLAG = 'DUBAI_REELLY_API_ENABLED' as const;
export const REELLY_BASE_URL = 'https://api-reelly.up.railway.app/api/v2/clients' as const;

class ReellyClient {
  private readonly apiKey: string | undefined;
  private readonly baseURL: string;

  constructor() {
    this.apiKey = process.env.REELLY_API_KEY;
    this.baseURL = REELLY_BASE_URL;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey) && isDubaiFlagEnabled(REELLY_FEATURE_FLAG);
  }

  hasApiKey(): boolean {
    return Boolean(this.apiKey);
  }

  isFlagOn(): boolean {
    return isDubaiFlagEnabled(REELLY_FEATURE_FLAG);
  }

  getApiKey(): string | undefined {
    return this.apiKey;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

let _instance: ReellyClient | null = null;

function getClient(): ReellyClient {
  if (_instance === null) {
    _instance = new ReellyClient();
  }
  return _instance;
}

/**
 * Reset singleton — solo para testing (vi.mock process.env).
 * @internal
 */
export function _resetReellyClientForTests(): void {
  _instance = null;
}

function stubError(): TRPCError {
  return new TRPCError({
    code: 'NOT_IMPLEMENTED',
    message:
      'Dubai Reelly integration STUB H1 — activar cuando REELLY_API_KEY configured y flag DUBAI_REELLY_API_ENABLED on',
  });
}

export async function listProjectsDubai(
  _filters: ReellyListProjectsFilters = {},
): Promise<ReadonlyArray<ReellyProject>> {
  const client = getClient();
  if (!client.isEnabled()) {
    throw stubError();
  }
  // H2 real fetch GET /projects?country=AE + filters
  // Implementación deferred a flag activation post REELLY_API_KEY provisioning.
  throw stubError();
}

export async function getProjectDetails(_id: string): Promise<ReellyProject | null> {
  const client = getClient();
  if (!client.isEnabled()) {
    throw stubError();
  }
  throw stubError();
}

export async function getProjectMarkers(): Promise<ReadonlyArray<ReellyMarker>> {
  const client = getClient();
  if (!client.isEnabled()) {
    throw stubError();
  }
  throw stubError();
}

export async function syncProjectsToDmx(
  _filters: ReellyListProjectsFilters = {},
): Promise<ReellySyncResult> {
  const client = getClient();
  if (!client.isEnabled()) {
    throw stubError();
  }
  throw stubError();
}

/**
 * testConnection: señal 2 ADR-018 — retorna ok:false con reason explícito si stub.
 * NO throw — método diagnostic siempre seguro para llamar.
 */
export async function testConnection(): Promise<ReellyConnectionTest> {
  const client = getClient();

  if (!client.hasApiKey()) {
    return {
      ok: false,
      account_balance: null,
      projects_available: null,
      reason: 'REELLY_API_KEY missing',
    };
  }

  if (!client.isFlagOn()) {
    return {
      ok: false,
      account_balance: null,
      projects_available: null,
      reason: 'flag DUBAI_REELLY_API_ENABLED disabled',
    };
  }

  // H2 real fetch GET / con apiKey header.
  // Implementación deferred a flag activation.
  return {
    ok: false,
    account_balance: null,
    projects_available: null,
    reason: 'flag DUBAI_REELLY_API_ENABLED disabled',
  };
}

export { DUBAI_FEATURE_FLAGS };
