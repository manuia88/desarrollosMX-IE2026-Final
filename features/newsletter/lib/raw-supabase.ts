// FASE 11.J — Raw supabase helper para tablas newsletter no en Database types.
//
// `newsletter_subscribers`, `newsletter_deliveries`, `newsletter_ab_tests`,
// `dmx_wrapped_snapshots` aún no están en `shared/types/database.ts` porque
// `npm run db:types` se corre POST-merge de la migration 20260421110000.
// L-NN-DB-TYPES-REGEN → resolver tras merge a main + db:types.
//
// `asRaw()` narrow el cliente a un shape minimal typed (select/eq/insert/etc)
// sin introducir `any`. Una vez se regeneren types, este helper queda
// legacy — los calls directos con `supabase.from('newsletter_subscribers')`
// tendrán overload válida.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

export interface RawQueryResult<T = unknown> {
  readonly data: readonly T[] | null;
  readonly error: { message: string } | null;
  readonly count?: number | null;
}

export interface RawSingleResult<T = unknown> {
  readonly data: T | null;
  readonly error: { message: string } | null;
}

export interface RawSelectBuilder extends PromiseLike<RawQueryResult> {
  readonly select: (cols?: string, opts?: { count?: string; head?: boolean }) => RawSelectBuilder;
  readonly eq: (col: string, value: unknown) => RawSelectBuilder;
  readonly neq: (col: string, value: unknown) => RawSelectBuilder;
  readonly in: (col: string, values: readonly unknown[]) => RawSelectBuilder;
  readonly gte: (col: string, value: unknown) => RawSelectBuilder;
  readonly lte: (col: string, value: unknown) => RawSelectBuilder;
  readonly not: (col: string, op: string, value: unknown) => RawSelectBuilder;
  readonly order: (col: string, opts?: { ascending?: boolean }) => RawSelectBuilder;
  readonly limit: (n: number) => RawSelectBuilder;
  readonly range: (from: number, to: number) => RawSelectBuilder;
  readonly maybeSingle: <T = unknown>() => Promise<RawSingleResult<T>>;
  readonly single: <T = unknown>() => Promise<RawSingleResult<T>>;
}

export interface RawUpdateBuilder extends PromiseLike<RawQueryResult> {
  readonly eq: (col: string, value: unknown) => RawUpdateBuilder;
  readonly select: (cols?: string) => RawSelectBuilder;
}

export interface RawInsertBuilder extends PromiseLike<RawQueryResult> {
  readonly select: (cols?: string) => RawSelectBuilder;
  readonly single: <T = unknown>() => Promise<RawSingleResult<T>>;
}

export interface RawTable {
  readonly select: (cols?: string, opts?: { count?: string; head?: boolean }) => RawSelectBuilder;
  readonly insert: (payload: Record<string, unknown>) => RawInsertBuilder;
  readonly update: (payload: Record<string, unknown>) => RawUpdateBuilder;
  readonly upsert: (
    payload: Record<string, unknown>,
    opts?: { onConflict?: string },
  ) => RawInsertBuilder;
}

export interface RawSupabase {
  readonly from: (table: string) => RawTable;
}

export function asRaw(client: SupabaseClient<Database>): RawSupabase {
  return client as unknown as RawSupabase;
}
