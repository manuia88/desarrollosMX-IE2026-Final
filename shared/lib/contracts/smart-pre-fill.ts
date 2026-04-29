// FASE 15.G.3 — Smart pre-fill engine for contracts (ADR-060)
//
// Reads operacion + unidad + esquema_pago + asesor profile + comprador lead
// and computes monetary breakdown (enganche, mensualidades, contra entrega,
// comisión asesor, IVA). Returns shape stored in contracts.pre_filled_data.
//
// Three pago scenarios supported:
//   1. Contado: 100% contra entrega.
//   2. MSI (mensualidades_count > 0, contra_entrega_pct=0): enganche + N MSI.
//   3. Financing: enganche + mensualidades + contra entrega.

import type { ContractType, PreFilledContractData } from './types';

interface OperacionRow {
  id: string;
  codigo: string | null;
  status: string;
  amount: number;
  asesor_id: string | null;
  propiedad_type: string | null;
  propiedad_id: string | null;
}

interface UnidadRow {
  id: string;
  numero: string;
  tipo: string;
  price_mxn: number | null;
  area_m2: number | null;
  proyecto_id: string;
}

interface ProyectoRow {
  id: string;
  nombre: string;
}

interface EsquemaPagoRow {
  id: string;
  nombre: string;
  enganche_pct: number;
  mensualidades_count: number;
  contra_entrega_pct: number;
  comision_pct: number;
  iva_calc_logic: string;
  meses_gracia: number;
  financing_partner: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
  rfc: string | null;
}

interface LeadRow {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export interface BuildContractDataInput {
  operacionId: string;
  contractType: ContractType;
  esquemaPagoId?: string | null;
}

interface SupabaseLikeClient {
  from(table: string): {
    select(query: string): {
      eq(
        col: string,
        val: string,
      ): {
        maybeSingle?: () => Promise<{
          data: unknown;
          error: { message: string } | null;
        }>;
        order?: (
          col: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{
              data: unknown;
              error: { message: string } | null;
            }>;
          };
        };
        eq?: (
          col: string,
          val: string,
        ) => {
          eq?: (
            col: string,
            val: string,
          ) => {
            maybeSingle: () => Promise<{
              data: unknown;
              error: { message: string } | null;
            }>;
          };
          maybeSingle?: () => Promise<{
            data: unknown;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };
}

const ROUND = (n: number): number => Math.round(n * 100) / 100;

function computeMontos(precio: number, esquema: EsquemaPagoRow): PreFilledContractData['montos'] {
  const enganche = ROUND(precio * (Number(esquema.enganche_pct) / 100));
  const contraEntrega = ROUND(precio * (Number(esquema.contra_entrega_pct) / 100));
  const restoFinanciado = ROUND(precio - enganche - contraEntrega);
  const mensualidad =
    esquema.mensualidades_count > 0 ? ROUND(restoFinanciado / esquema.mensualidades_count) : 0;
  const comisionBase = ROUND(precio * (Number(esquema.comision_pct) / 100));
  const ivaPct = esquema.iva_calc_logic === 'no_iva' ? 0 : 16;
  const iva = ROUND(comisionBase * (ivaPct / 100));
  const total = ROUND(precio + iva);

  return {
    precio_unidad_mxn: ROUND(precio),
    enganche_mxn: enganche,
    contra_entrega_mxn: contraEntrega,
    mensualidad_mxn: mensualidad,
    comision_asesor_mxn: comisionBase,
    iva_mxn: iva,
    total_mxn: total,
  };
}

export async function buildContractData(
  supabase: SupabaseLikeClient,
  input: BuildContractDataInput,
): Promise<PreFilledContractData> {
  const opRes = await supabase
    .from('operaciones')
    .select('id, codigo, status, amount, asesor_id, propiedad_type, propiedad_id')
    .eq('id', input.operacionId)
    .maybeSingle?.();
  if (!opRes || opRes.error) {
    throw new Error(
      `smart-pre-fill: operacion fetch failed: ${opRes?.error?.message ?? 'no client'}`,
    );
  }
  const operacion = opRes.data as OperacionRow | null;
  if (!operacion) throw new Error('smart-pre-fill: operacion not found');

  let unidad: UnidadRow | null = null;
  let proyecto: ProyectoRow | null = null;
  if (operacion.propiedad_type === 'unidad' && operacion.propiedad_id) {
    const uRes = await supabase
      .from('unidades')
      .select('id, numero, tipo, price_mxn, area_m2, proyecto_id')
      .eq('id', operacion.propiedad_id)
      .maybeSingle?.();
    unidad = (uRes?.data ?? null) as UnidadRow | null;
    if (unidad?.proyecto_id) {
      const pRes = await supabase
        .from('proyectos')
        .select('id, nombre')
        .eq('id', unidad.proyecto_id)
        .maybeSingle?.();
      proyecto = (pRes?.data ?? null) as ProyectoRow | null;
    }
  }

  let esquema: EsquemaPagoRow | null = null;
  if (input.esquemaPagoId) {
    const eRes = await supabase
      .from('esquemas_pago')
      .select(
        'id, nombre, enganche_pct, mensualidades_count, contra_entrega_pct, comision_pct, iva_calc_logic, meses_gracia, financing_partner',
      )
      .eq('id', input.esquemaPagoId)
      .maybeSingle?.();
    esquema = (eRes?.data ?? null) as EsquemaPagoRow | null;
  } else if (unidad?.proyecto_id) {
    const eRes = await supabase
      .from('esquemas_pago')
      .select(
        'id, nombre, enganche_pct, mensualidades_count, contra_entrega_pct, comision_pct, iva_calc_logic, meses_gracia, financing_partner',
      )
      .eq('proyecto_id', unidad.proyecto_id);
    const chained = eRes as unknown as {
      eq: (
        col: string,
        val: string,
      ) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{
              data: unknown;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    if (chained?.eq) {
      const r = await chained
        .eq('active', 'true')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      esquema = (r?.data ?? null) as EsquemaPagoRow | null;
    }
  }

  const fallbackEsquema: EsquemaPagoRow = {
    id: '',
    nombre: 'Contado',
    enganche_pct: 0,
    mensualidades_count: 0,
    contra_entrega_pct: 100,
    comision_pct: 4,
    iva_calc_logic: 'on_commission',
    meses_gracia: 0,
    financing_partner: null,
  };
  const esquemaEffective = esquema ?? fallbackEsquema;

  let asesor: ProfileRow | null = null;
  if (operacion.asesor_id) {
    const aRes = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email, rfc')
      .eq('id', operacion.asesor_id)
      .maybeSingle?.();
    asesor = (aRes?.data ?? null) as ProfileRow | null;
  }

  let comprador: LeadRow | null = null;
  const partsRes = await supabase
    .from('operacion_parts')
    .select('contacto_id, role')
    .eq('operacion_id', operacion.id);
  const partsList = (
    partsRes as unknown as { data: Array<{ contacto_id: string | null; role: string }> | null }
  )?.data;
  const compradorPart = partsList?.find((p) => p.role === 'comprador');
  if (compradorPart?.contacto_id) {
    const cRes = await supabase
      .from('leads')
      .select('id, contact_name, contact_email, contact_phone')
      .eq('id', compradorPart.contacto_id)
      .maybeSingle?.();
    comprador = (cRes?.data ?? null) as LeadRow | null;
  }

  const precio = unidad?.price_mxn ?? operacion.amount ?? 0;
  const montos = computeMontos(Number(precio), esquemaEffective);

  return {
    unidad: {
      id: unidad?.id ?? null,
      numero: unidad?.numero ?? null,
      tipo: unidad?.tipo ?? null,
      price_mxn: Number(precio),
      area_m2: unidad?.area_m2 ?? null,
      proyecto_id: unidad?.proyecto_id ?? null,
      proyecto_nombre: proyecto?.nombre ?? null,
    },
    esquema: {
      id: esquema?.id ?? null,
      nombre: esquemaEffective.nombre,
      enganche_pct: Number(esquemaEffective.enganche_pct),
      mensualidades_count: esquemaEffective.mensualidades_count,
      contra_entrega_pct: Number(esquemaEffective.contra_entrega_pct),
      comision_pct: Number(esquemaEffective.comision_pct),
      iva_calc_logic: esquemaEffective.iva_calc_logic,
      meses_gracia: esquemaEffective.meses_gracia,
      financing_partner: esquemaEffective.financing_partner,
    },
    comprador: {
      id: comprador?.id ?? null,
      nombre: comprador?.contact_name ?? null,
      email: comprador?.contact_email ?? null,
      telefono: comprador?.contact_phone ?? null,
    },
    asesor: {
      id: asesor?.id ?? null,
      nombre:
        asesor?.full_name ??
        (`${asesor?.first_name ?? ''} ${asesor?.last_name ?? ''}`.trim() || null),
      email: asesor?.email ?? null,
      rfc: asesor?.rfc ?? null,
    },
    montos,
    meta: {
      operacion_id: operacion.id,
      operacion_codigo: operacion.codigo,
      operacion_status: operacion.status,
      contract_type: input.contractType,
      generated_at: new Date().toISOString(),
    },
  };
}

// Exported for unit tests — pure compute, no I/O.
export function _computeMontosForTest(
  precio: number,
  esquema: {
    enganche_pct: number;
    mensualidades_count: number;
    contra_entrega_pct: number;
    comision_pct: number;
    iva_calc_logic: string;
    meses_gracia: number;
    financing_partner: string | null;
    id: string;
    nombre: string;
  },
): PreFilledContractData['montos'] {
  return computeMontos(precio, esquema as EsquemaPagoRow);
}
