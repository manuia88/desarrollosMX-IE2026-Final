import type { User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '@/server/trpc/context';

// Modo A — createCaller con createAdminClient mocked.
// Coverage CC-A 15.C: requestWorksheet / approveWorksheet / rejectWorksheet /
// cancelWorksheet / listMyWorksheets (CF.4 priority sort).

type QueryShape = { data: unknown; error: unknown };
type TableState = { select?: QueryShape; insert?: QueryShape; update?: QueryShape };

interface FakeBuilder {
  // biome-ignore lint/suspicious/noExplicitAny: chained mock builder
  [k: string]: any;
}

function chain(state: TableState): FakeBuilder {
  let mode: 'select' | 'insert' | 'update' = 'select';
  // biome-ignore lint/suspicious/noExplicitAny: chained stub
  const c: any = {};
  const resolveResult = (): QueryShape => {
    if (mode === 'insert') return state.insert ?? { data: null, error: null };
    if (mode === 'update') return state.update ?? { data: null, error: null };
    return state.select ?? { data: [], error: null };
  };
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.lt = vi.fn(() => c);
  c.gte = vi.fn(() => c);
  c.lte = vi.fn(() => c);
  c.order = vi.fn(() => c);
  c.limit = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(resolveResult()));
  c.single = vi.fn(() => Promise.resolve(resolveResult()));
  c.insert = vi.fn(() => {
    mode = 'insert';
    return c;
  });
  c.update = vi.fn(() => {
    mode = 'update';
    return c;
  });
  // biome-ignore lint/suspicious/noThenProperty: supabase builder is thenable
  c.then = (resolve: (v: QueryShape) => unknown) => Promise.resolve(resolveResult()).then(resolve);
  return c;
}

let tableRegistry: Record<string, TableState> = {};

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => chain(tableRegistry[table] ?? {}),
  }),
}));

const ASESOR_UUID = 'a1111111-1111-4111-8111-111111111111';
const DEV_USER_UUID = 'd2222222-2222-4222-8222-222222222222';
const DESARROLLADORA_UUID = 'a3333333-3333-4333-8333-333333333333';
const UNIT_UUID = 'b4444444-4444-4444-8444-444444444444';
const PROYECTO_UUID = 'e5555555-5555-4555-8555-555555555555';
const WORKSHEET_UUID = 'f6666666-6666-4666-8666-666666666666';

function buildAsesorCtx(): Context {
  const supabase = {
    rpc: vi.fn(async (fnName: string) => {
      if (fnName === 'check_rate_limit_db') return { data: true, error: null };
      return { data: null, error: null };
    }),
  };
  return {
    supabase,
    headers: new Headers(),
    user: { id: ASESOR_UUID, email: 'asesor@example.com' } as unknown as User,
    profile: { id: ASESOR_UUID, rol: 'asesor' },
  } as unknown as Context;
}

function buildDevCtx(): Context {
  const supabase = {
    rpc: vi.fn(async (fnName: string) => {
      if (fnName === 'check_rate_limit_db') return { data: true, error: null };
      return { data: null, error: null };
    }),
  };
  return {
    supabase,
    headers: new Headers(),
    user: { id: DEV_USER_UUID, email: 'dev@example.com' } as unknown as User,
    profile: {
      id: DEV_USER_UUID,
      rol: 'admin_desarrolladora',
      desarrolladora_id: DESARROLLADORA_UUID,
    },
  } as unknown as Context;
}

beforeEach(() => {
  tableRegistry = {};
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('worksheets.requestWorksheet', () => {
  it('inserta worksheet pending cuando unidad disponible', async () => {
    tableRegistry.unidades = {
      select: {
        data: { id: UNIT_UUID, status: 'disponible', proyecto_id: PROYECTO_UUID },
        error: null,
      },
    };
    tableRegistry.proyectos = {
      select: {
        data: { id: PROYECTO_UUID, desarrolladora_id: DESARROLLADORA_UUID },
        error: null,
      },
    };
    tableRegistry.unit_worksheets = {
      insert: {
        data: {
          id: WORKSHEET_UUID,
          unit_id: UNIT_UUID,
          asesor_id: ASESOR_UUID,
          desarrolladora_id: DESARROLLADORA_UUID,
          status: 'pending',
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          requested_at: new Date().toISOString(),
          decided_at: null,
          decided_by: null,
          reject_reason: null,
          client_first_name: 'Juan',
          notes: null,
          operacion_id: null,
        },
        error: null,
      },
    };

    const { worksheetsRouter } = await import('../routes/worksheets');
    const caller = worksheetsRouter.createCaller(buildAsesorCtx());
    const result = await caller.requestWorksheet({
      unitId: UNIT_UUID,
      clientFirstName: 'Juan',
      clientPhone: '5555555555',
    });
    expect(result.id).toBe(WORKSHEET_UUID);
    expect(result.status).toBe('pending');
  });

  it('rechaza si unidad no disponible', async () => {
    tableRegistry.unidades = {
      select: {
        data: { id: UNIT_UUID, status: 'reservada', proyecto_id: PROYECTO_UUID },
        error: null,
      },
    };
    const { worksheetsRouter } = await import('../routes/worksheets');
    const caller = worksheetsRouter.createCaller(buildAsesorCtx());
    await expect(
      caller.requestWorksheet({
        unitId: UNIT_UUID,
        clientFirstName: 'Juan',
      }),
    ).rejects.toThrow();
  });
});

describe('worksheets.approveWorksheet', () => {
  it('dev aprueba worksheet pending', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const baseRow = {
      id: WORKSHEET_UUID,
      unit_id: UNIT_UUID,
      asesor_id: ASESOR_UUID,
      desarrolladora_id: DESARROLLADORA_UUID,
      expires_at: expiresAt,
      requested_at: new Date().toISOString(),
      reject_reason: null,
      client_first_name: 'Juan',
      notes: null,
      operacion_id: null,
    };
    tableRegistry.unit_worksheets = {
      select: {
        data: { ...baseRow, status: 'pending', decided_at: null, decided_by: null },
        error: null,
      },
      update: {
        data: {
          ...baseRow,
          status: 'approved',
          decided_at: new Date().toISOString(),
          decided_by: DEV_USER_UUID,
        },
        error: null,
      },
    };
    const { worksheetsRouter } = await import('../routes/worksheets');
    const caller = worksheetsRouter.createCaller(buildDevCtx());
    const result = await caller.approveWorksheet({ worksheetId: WORKSHEET_UUID });
    expect(result.status).toBe('approved');
    expect(result.decided_by).toBe(DEV_USER_UUID);
  });
});

describe('worksheets.rejectWorksheet', () => {
  it('dev rechaza worksheet con razón', async () => {
    const baseRow = {
      id: WORKSHEET_UUID,
      unit_id: UNIT_UUID,
      asesor_id: ASESOR_UUID,
      desarrolladora_id: DESARROLLADORA_UUID,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      requested_at: new Date().toISOString(),
      client_first_name: 'Juan',
      notes: null,
      operacion_id: null,
    };
    tableRegistry.unit_worksheets = {
      select: {
        data: {
          ...baseRow,
          status: 'pending',
          decided_at: null,
          decided_by: null,
          reject_reason: null,
        },
        error: null,
      },
      update: {
        data: {
          ...baseRow,
          status: 'rejected',
          decided_at: new Date().toISOString(),
          decided_by: DEV_USER_UUID,
          reject_reason: 'datos incompletos',
        },
        error: null,
      },
    };
    const { worksheetsRouter } = await import('../routes/worksheets');
    const caller = worksheetsRouter.createCaller(buildDevCtx());
    const result = await caller.rejectWorksheet({
      worksheetId: WORKSHEET_UUID,
      reason: 'datos incompletos',
    });
    expect(result.status).toBe('rejected');
    expect(result.reject_reason).toBe('datos incompletos');
  });
});

describe('worksheets.cancelWorksheet', () => {
  it('asesor cancela su propia worksheet pending', async () => {
    const baseRow = {
      id: WORKSHEET_UUID,
      unit_id: UNIT_UUID,
      asesor_id: ASESOR_UUID,
      desarrolladora_id: DESARROLLADORA_UUID,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      requested_at: new Date().toISOString(),
      reject_reason: null,
      client_first_name: 'Juan',
      notes: null,
      operacion_id: null,
    };
    tableRegistry.unit_worksheets = {
      select: {
        data: { ...baseRow, status: 'pending', decided_at: null, decided_by: null },
        error: null,
      },
      update: {
        data: {
          ...baseRow,
          status: 'cancelled',
          decided_at: new Date().toISOString(),
          decided_by: ASESOR_UUID,
        },
        error: null,
      },
    };
    const { worksheetsRouter } = await import('../routes/worksheets');
    const caller = worksheetsRouter.createCaller(buildAsesorCtx());
    const result = await caller.cancelWorksheet({ worksheetId: WORKSHEET_UUID });
    expect(result.status).toBe('cancelled');
  });
});

describe('worksheets.listMyWorksheets — CF.4 priority sort', () => {
  it('ordena por priority_score desc (más urgente primero)', async () => {
    const nowMs = Date.now();
    const farId = 'f1111111-1111-4111-8111-111111111111';
    const closeId = 'c2222222-2222-4222-8222-222222222222';
    tableRegistry.unit_worksheets = {
      select: {
        data: [
          {
            id: farId,
            unit_id: UNIT_UUID,
            asesor_id: ASESOR_UUID,
            desarrolladora_id: DESARROLLADORA_UUID,
            status: 'pending',
            expires_at: new Date(nowMs + 40 * 60 * 60 * 1000).toISOString(),
            requested_at: new Date().toISOString(),
            decided_at: null,
            decided_by: null,
            reject_reason: null,
            client_first_name: 'Juan',
            notes: null,
            operacion_id: null,
          },
          {
            id: closeId,
            unit_id: UNIT_UUID,
            asesor_id: ASESOR_UUID,
            desarrolladora_id: DESARROLLADORA_UUID,
            status: 'pending',
            expires_at: new Date(nowMs + 2 * 60 * 60 * 1000).toISOString(),
            requested_at: new Date().toISOString(),
            decided_at: null,
            decided_by: null,
            reject_reason: null,
            client_first_name: 'María',
            notes: null,
            operacion_id: null,
          },
        ],
        error: null,
      },
    };
    const { worksheetsRouter } = await import('../routes/worksheets');
    const caller = worksheetsRouter.createCaller(buildAsesorCtx());
    const result = await caller.listMyWorksheets({ limit: 50 });
    expect(result).toHaveLength(2);
    const first = result[0];
    const second = result[1];
    expect(first?.id).toBe(closeId);
    expect(second?.id).toBe(farId);
    if (first && second) {
      expect(first.priority_score).toBeGreaterThan(second.priority_score);
    }
  });
});
