import { z } from 'zod';
import {
  COUNTRY_CODES,
  type CountryCode,
  INDEX_CODES,
  type IndexCode,
  SCOPE_TYPES,
  type ScopeType,
} from './index-registry-helpers';

// SSOT para payload hash-sharing del backtest. El schema valida tanto antes
// de encodificar como después de decodificar — los extras son rechazados via
// .strict() para evitar payloads inflados en URL.
const SCOPE_ID_REGEX = /^[A-Za-z0-9_\-:]+$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const backtestHashSchema = z
  .object({
    i: z.enum(INDEX_CODES),
    s: z.enum(SCOPE_TYPES),
    c: z.enum(COUNTRY_CODES),
    f: z.string().regex(ISO_DATE_REGEX),
    t: z.string().regex(ISO_DATE_REGEX),
    x: z.array(z.string().min(1).max(120).regex(SCOPE_ID_REGEX)).min(1).max(4),
    n: z.number().int().positive().max(500).optional(),
  })
  .strict()
  .refine((data) => data.f < data.t, {
    message: 'from must be strictly before to',
    path: ['f'],
  });

export type BacktestHashPayload = z.infer<typeof backtestHashSchema>;

export interface BacktestHashInput {
  readonly indexCode: IndexCode;
  readonly scopeType: ScopeType;
  readonly countryCode: CountryCode;
  readonly from: string;
  readonly to: string;
  readonly scopeIds: readonly string[];
  readonly topN?: number;
}

function toPayload(input: BacktestHashInput): BacktestHashPayload {
  const base = {
    i: input.indexCode,
    s: input.scopeType,
    c: input.countryCode,
    f: input.from,
    t: input.to,
    x: [...input.scopeIds],
  };
  if (typeof input.topN === 'number') {
    return { ...base, n: input.topN };
  }
  return base;
}

function fromPayload(payload: BacktestHashPayload): BacktestHashInput {
  const base: BacktestHashInput = {
    indexCode: payload.i,
    scopeType: payload.s,
    countryCode: payload.c,
    from: payload.f,
    to: payload.t,
    scopeIds: [...payload.x],
    ...(typeof payload.n === 'number' ? { topN: payload.n } : {}),
  };
  return base;
}

export function encodeBacktestHash(input: BacktestHashInput): string {
  const payload = toPayload(input);
  const parsed = backtestHashSchema.parse(payload);
  const json = JSON.stringify(parsed);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeBacktestHash(hash: string): BacktestHashInput | null {
  if (typeof hash !== 'string' || hash.length === 0) return null;
  // base64url charset: A-Za-z0-9-_ (no padding)
  if (!/^[A-Za-z0-9_-]+$/.test(hash)) return null;
  try {
    const json = Buffer.from(hash, 'base64url').toString('utf8');
    if (json.length === 0) return null;
    const parsedJson: unknown = JSON.parse(json);
    const result = backtestHashSchema.safeParse(parsedJson);
    if (!result.success) return null;
    return fromPayload(result.data);
  } catch {
    return null;
  }
}
