import type { IngestCtx, IngestResult } from './types';

// Driver pattern (upgrade técnico aprobado §5.A FASE 07).
// Estandariza ingestores REST / XLSX / PDF / shapefile / scraping-friendly
// bajo una interfaz común. Cada source implementa IngestDriver y se registra
// en un mapa { source → driver } consumido por el orchestrator y crons.

export interface IngestDriver<TInput = void, TPayload = unknown> {
  readonly source: string;
  readonly category: 'macro' | 'geo' | 'market' | 'derived';
  readonly defaultPeriodicity:
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly'
    | 'on_demand';
  fetch(ctx: IngestCtx, input: TInput): Promise<TPayload>;
  parse(payload: TPayload, ctx: IngestCtx): Promise<unknown[]>;
  upsert(rows: unknown[], ctx: IngestCtx): Promise<IngestResult>;
}

const REGISTRY = new Map<string, IngestDriver<unknown, unknown>>();

export function registerDriver<TInput = void, TPayload = unknown>(
  driver: IngestDriver<TInput, TPayload>,
): void {
  REGISTRY.set(driver.source, driver as unknown as IngestDriver<unknown, unknown>);
}

export function getDriver(source: string): IngestDriver | undefined {
  return REGISTRY.get(source);
}

export function listDrivers(category?: 'macro' | 'geo' | 'market' | 'derived'): IngestDriver[] {
  const all = Array.from(REGISTRY.values());
  return category ? all.filter((d) => d.category === category) : all;
}
