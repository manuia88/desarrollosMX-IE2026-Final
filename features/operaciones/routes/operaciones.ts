import { TRPCError } from '@trpc/server';
import {
  cancelOperacionInput,
  createOperacionInput,
  emitCFDIInput,
  getOperacionByIdInput,
  isStatusTransitionValid,
  listOperacionesInput,
  type OperacionStatus,
  parsePegarLigaInput,
  registerPagoInput,
  STATUS_COMPLETION_PCT,
  updateOperacionStatusInput,
} from '@/features/operaciones/schemas';
import { router } from '@/server/trpc/init';
import { authenticatedProcedure } from '@/server/trpc/middleware';
import { createAdminClient } from '@/shared/lib/supabase/admin';

const OPERACION_FIELDS =
  'id, codigo, country_code, side, status, fiscal_status, fecha_cierre, asesor_id, deal_id, propiedad_type, propiedad_id, reserva_amount, reserva_currency, promocion_amount, promocion_currency, cierre_amount, cierre_currency, fx_rate, fx_rate_date, completion_pct, cancellation_reason, notas, amount, amount_currency, operacion_type, closed_at, created_at, updated_at';

type AdminClient = ReturnType<typeof createAdminClient>;

async function fetchOwnedOperacion(
  supabase: AdminClient,
  operacionId: string,
  userId: string,
  isAdmin: boolean,
): Promise<{ id: string; status: OperacionStatus; asesor_id: string | null }> {
  const { data, error } = await supabase
    .from('operaciones')
    .select('id, status, asesor_id')
    .eq('id', operacionId)
    .maybeSingle();
  if (error) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
  }
  if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
  if (!isAdmin && data.asesor_id !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return { id: data.id, status: data.status as OperacionStatus, asesor_id: data.asesor_id };
}

function isAdminProfile(profile: { rol?: string | null } | null | undefined): boolean {
  return profile?.rol === 'superadmin' || profile?.rol === 'mb_admin';
}

export const operacionesRouter = router({
  listOperaciones: authenticatedProcedure
    .input(listOperacionesInput)
    .query(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('operaciones')
        .select(OPERACION_FIELDS)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (!isAdminProfile(ctx.profile)) {
        query = query.eq('asesor_id', ctx.user.id);
      }
      if (input.status) query = query.eq('status', input.status);
      if (input.side) query = query.eq('side', input.side);
      if (input.currency) query = query.eq('cierre_currency', input.currency);
      if (input.fechaCierreFrom) query = query.gte('fecha_cierre', input.fechaCierreFrom);
      if (input.fechaCierreTo) query = query.lte('fecha_cierre', input.fechaCierreTo);

      const { data, error } = await query;
      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `operaciones list failed: ${error.message}`,
        });
      }
      return data ?? [];
    }),

  getById: authenticatedProcedure.input(getOperacionByIdInput).query(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const isAdmin = isAdminProfile(ctx.profile);
    const { data, error } = await supabase
      .from('operaciones')
      .select(OPERACION_FIELDS)
      .eq('id', input.id)
      .maybeSingle();
    if (error) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
    }
    if (!data) throw new TRPCError({ code: 'NOT_FOUND' });
    if (!isAdmin && data.asesor_id !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    const [partsRes, commissionRes, pagosRes, attachmentsRes] = await Promise.all([
      supabase.from('operacion_parts').select('*').eq('operacion_id', input.id),
      supabase.from('operacion_commissions').select('*').eq('operacion_id', input.id).maybeSingle(),
      supabase
        .from('operacion_pagos')
        .select('*')
        .eq('operacion_id', input.id)
        .order('fecha_pago', { ascending: false }),
      supabase.from('operacion_attachments').select('*').eq('operacion_id', input.id),
    ]);
    return {
      operacion: data,
      parts: partsRes.data ?? [],
      commission: commissionRes.data,
      pagos: pagosRes.data ?? [],
      attachments: attachmentsRes.data ?? [],
    };
  }),

  createOperacion: authenticatedProcedure
    .input(createOperacionInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const operacionType =
        input.vendedor.propiedadType === 'propiedad_secundaria' ? 'reventa' : 'venta';
      const insertOperacion = {
        asesor_id: ctx.user.id,
        country_code: input.countryCode,
        side: input.side,
        status: input.estado.status,
        fecha_cierre: input.estado.fechaCierre,
        propiedad_type: input.vendedor.propiedadType,
        propiedad_id: input.vendedor.propiedadId,
        reserva_amount: input.estado.reservaAmount ?? null,
        reserva_currency: input.estado.reservaCurrency ?? null,
        promocion_amount: input.estado.promocionAmount ?? null,
        promocion_currency: input.estado.promocionCurrency ?? null,
        cierre_amount: input.estado.cierreAmount,
        cierre_currency: input.estado.cierreCurrency,
        fx_rate: input.estado.fxRate ?? null,
        fx_rate_date: input.estado.fxRateDate ?? null,
        completion_pct: STATUS_COMPLETION_PCT[input.estado.status],
        notas: input.notas.notas ?? null,
        amount: input.estado.cierreAmount,
        amount_currency: input.estado.cierreCurrency,
        operacion_type: operacionType,
        commission_amount: 0,
      } as const;

      const { data: opRow, error: opError } = await supabase
        .from('operaciones')
        .insert(insertOperacion as never)
        .select(OPERACION_FIELDS)
        .single();
      if (opError || !opRow) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `operaciones insert failed: ${opError?.message ?? 'unknown'}`,
        });
      }

      const partsToInsert: Array<{
        operacion_id: string;
        role: string;
        asesor_id: string | null;
        contacto_id: string | null;
        country_code: string;
      }> = [
        {
          operacion_id: opRow.id,
          role: 'asesor_comprador',
          asesor_id: input.comprador.asesorId,
          contacto_id: null,
          country_code: input.countryCode,
        },
        {
          operacion_id: opRow.id,
          role: 'comprador',
          asesor_id: null,
          contacto_id: input.comprador.contactoId,
          country_code: input.countryCode,
        },
        {
          operacion_id: opRow.id,
          role: 'asesor_vendedor',
          asesor_id: input.vendedor.asesorVendedorId,
          contacto_id: null,
          country_code: input.countryCode,
        },
        {
          operacion_id: opRow.id,
          role: 'propietario',
          asesor_id: null,
          contacto_id: input.vendedor.propietarioContactoId,
          country_code: input.countryCode,
        },
      ];
      if (input.vendedor.asesorProductorId) {
        partsToInsert.push({
          operacion_id: opRow.id,
          role: 'asesor_productor',
          asesor_id: input.vendedor.asesorProductorId,
          contacto_id: null,
          country_code: input.countryCode,
        });
      }

      const { error: partsError } = await supabase
        .from('operacion_parts')
        .insert(partsToInsert as never);
      if (partsError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `operacion_parts insert failed: ${partsError.message}`,
        });
      }

      const { error: commError } = await supabase.from('operacion_commissions').insert({
        operacion_id: opRow.id,
        base_amount: input.estado.cierreAmount,
        comision_pct: input.comision.comisionPct,
        iva_pct: input.comision.ivaPct,
        split_dmx_pct: input.comision.splitDmxPct,
        declaracion_jurada: input.comision.declaracionJurada,
        factura_attachment_id: input.comision.facturaAttachmentId ?? null,
        currency: input.estado.cierreCurrency,
      } as never);
      if (commError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `operacion_commissions insert failed: ${commError.message}`,
        });
      }

      return { id: opRow.id, codigo: opRow.codigo, status: opRow.status };
    }),

  updateStatus: authenticatedProcedure
    .input(updateOperacionStatusInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);
      const existing = await fetchOwnedOperacion(supabase, input.id, ctx.user.id, isAdmin);

      if (!isStatusTransitionValid(existing.status, input.newStatus)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `invalid transition ${existing.status} → ${input.newStatus}`,
        });
      }

      if (existing.status === 'propuesta' && input.newStatus === 'oferta_aceptada') {
        if (input.firmaSimple !== true) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'firma simple requerida' });
        }
      }
      if (existing.status === 'oferta_aceptada' && input.newStatus === 'escritura') {
        if (input.legalFlowInitiated !== true) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'legal flow requerido (módulo /legal H2 STUB)',
          });
        }
      }
      if (existing.status === 'escritura' && input.newStatus === 'cerrada') {
        if (input.mifielCompleted !== true) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'firma Mifiel NOM-151 requerida (H2 STUB)',
          });
        }
      }

      const patch: Record<string, unknown> = {
        status: input.newStatus,
        completion_pct: STATUS_COMPLETION_PCT[input.newStatus],
      };
      if (input.newStatus === 'cancelada' && input.motivo) {
        patch.cancellation_reason = input.motivo;
      }
      if (input.newStatus === 'cerrada') {
        patch.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('operaciones')
        .update(patch as never)
        .eq('id', input.id)
        .select(OPERACION_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `operaciones updateStatus failed: ${error?.message ?? 'unknown'}`,
        });
      }
      return data;
    }),

  cancelOperacion: authenticatedProcedure
    .input(cancelOperacionInput)
    .mutation(async ({ ctx, input }) => {
      const supabase = createAdminClient();
      const isAdmin = isAdminProfile(ctx.profile);
      await fetchOwnedOperacion(supabase, input.id, ctx.user.id, isAdmin);
      const { data, error } = await supabase
        .from('operaciones')
        .update({
          status: 'cancelada',
          completion_pct: STATUS_COMPLETION_PCT.cancelada,
          cancellation_reason: input.motivo,
        } as never)
        .eq('id', input.id)
        .select(OPERACION_FIELDS)
        .single();
      if (error || !data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `operaciones cancel failed: ${error?.message ?? 'unknown'}`,
        });
      }
      return data;
    }),

  registerPago: authenticatedProcedure.input(registerPagoInput).mutation(async ({ ctx, input }) => {
    const supabase = createAdminClient();
    const isAdmin = isAdminProfile(ctx.profile);
    await fetchOwnedOperacion(supabase, input.operacionId, ctx.user.id, isAdmin);

    const { data, error } = await supabase
      .from('operacion_pagos')
      .insert({
        operacion_id: input.operacionId,
        amount: input.amount,
        currency: input.currency,
        fecha_pago: input.fechaPago,
        estado_pago: input.estadoPago,
        comprobante_attachment_id: input.comprobanteAttachmentId ?? null,
        notes: input.notes ?? null,
      } as never)
      .select('*')
      .single();
    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `operacion_pagos insert failed: ${error?.message ?? 'unknown'}`,
      });
    }
    return data;
  }),

  parsePegarLiga: authenticatedProcedure.input(parsePegarLigaInput).mutation(async () => {
    // STUB ADR-018 — activar en FASE 22 H2 con [dependencia: scrapers EasyBroker / ML / Inmuebles24]
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message:
        'Pegar Liga parser disponible en FASE 22 H2 — requiere scrapers + contratos EasyBroker/ML/Inmuebles24',
    });
  }),

  emitCFDI: authenticatedProcedure.input(emitCFDIInput).mutation(async () => {
    // STUB ADR-018 — activar en FASE 22 H2 con [dependencia: Facturapi.io contrato + Mifiel NOM-151]
    throw new TRPCError({
      code: 'NOT_IMPLEMENTED',
      message:
        'CFDI emisión disponible en FASE 22 H2 — requiere contrato Facturapi.io + Finkok PAC',
    });
  }),
});
