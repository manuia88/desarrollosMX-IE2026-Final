// FASE 15.G.3 — Contract PDF generator (3 templates)
//
// APS (Acuerdo de Preventa), Promesa de Compraventa, Reserva.
// Cuerpo legal estándar MX. Body content placeholder canon — abogado
// review pending H2 antes de e-sign real con Mifiel/DocuSign.

import { Document, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import { createElement, type ReactElement } from 'react';
import { createAdminClient } from '@/shared/lib/supabase/admin';
import type { ContractType, PreFilledContractData } from './types';

const TOKENS = {
  primary: '#6366F1',
  accent: '#EC4899',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#e2e8f0',
  background: '#ffffff',
} as const;

const styles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10.5,
    lineHeight: 1.55,
    fontFamily: 'Helvetica',
    color: TOKENS.text,
    backgroundColor: TOKENS.background,
  },
  brand: {
    fontSize: 11,
    color: TOKENS.primary,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: TOKENS.muted,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 14,
    marginBottom: 6,
    color: TOKENS.primary,
  },
  paragraph: {
    marginBottom: 6,
  },
  kv: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  kvLabel: {
    width: 180,
    color: TOKENS.muted,
  },
  kvValue: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: TOKENS.subtle,
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: TOKENS.subtle,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  signatureBlock: {
    marginTop: 28,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderColor: TOKENS.text,
    width: 220,
    marginTop: 30,
    paddingTop: 4,
    fontSize: 9,
    color: TOKENS.muted,
  },
  disclaimerBadge: {
    fontSize: 9,
    color: TOKENS.accent,
    marginTop: 16,
    fontFamily: 'Helvetica-Oblique',
  },
});

const TEMPLATE_TITLES: Record<ContractType, string> = {
  aps: 'Acuerdo de Preventa (APS)',
  promesa: 'Promesa de Compraventa',
  reserva: 'Contrato de Reserva',
};

const TEMPLATE_BODIES: Record<ContractType, string[]> = {
  aps: [
    'El presente acuerdo de preventa se celebra entre la parte vendedora (en lo sucesivo "El Desarrollador") y la parte compradora (en lo sucesivo "El Comprador"), respecto a la unidad descrita en este documento.',
    'El Comprador manifiesta su interés en adquirir la unidad bajo las condiciones de pago descritas más adelante, sujetas a la firma del contrato de compraventa definitivo.',
    'El Desarrollador se compromete a reservar la unidad por un periodo de 15 días naturales a partir de la firma del presente, plazo durante el cual no podrá ofrecer la unidad a terceros.',
  ],
  promesa: [
    'En la ciudad correspondiente al domicilio fiscal del Desarrollador, las partes celebran el presente contrato de Promesa de Compraventa al tenor de las siguientes declaraciones y cláusulas.',
    'El Promitente Vendedor se obliga a transmitir la propiedad de la unidad al Promitente Comprador una vez que se cumplan las condiciones suspensivas pactadas, incluida la liquidación total del precio.',
    'El Promitente Comprador se obliga a cubrir el precio en los términos del esquema de pago anexo, así como los gastos notariales y fiscales aplicables a la firma de la escritura pública.',
  ],
  reserva: [
    'El presente contrato tiene por objeto reservar la unidad descrita por un periodo determinado, mediante el pago del monto de reserva pactado, a cuenta del precio total.',
    'En caso de que el Comprador desista de la operación dentro del plazo de reserva, el Desarrollador retendrá el 100% del monto de reserva como penalización pactada.',
    'En caso de que el Desarrollador no cumpla con la obligación de reservar la unidad, deberá reintegrar al Comprador el doble del monto de reserva como pena convencional.',
  ],
};

function fmtMxn(n: number): string {
  return n.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
}

function buildContractElement(data: PreFilledContractData): ReactElement {
  const ctype = data.meta.contract_type;
  const title = TEMPLATE_TITLES[ctype];
  const bodies = TEMPLATE_BODIES[ctype];

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'LETTER', style: styles.page },
      createElement(Text, { style: styles.brand }, 'DESARROLLOS MX'),
      createElement(Text, { style: styles.title }, title),
      createElement(
        Text,
        { style: styles.subtitle },
        `Operación ${data.meta.operacion_codigo ?? data.meta.operacion_id} · Generado ${data.meta.generated_at}`,
      ),
      createElement(Text, { style: styles.sectionTitle }, 'Partes'),
      createElement(
        View,
        null,
        kv('Comprador', data.comprador.nombre ?? 'Por definir'),
        kv('Email comprador', data.comprador.email ?? '—'),
        kv('Asesor', data.asesor.nombre ?? 'Por definir'),
        kv('Email asesor', data.asesor.email ?? '—'),
      ),
      createElement(Text, { style: styles.sectionTitle }, 'Unidad'),
      createElement(
        View,
        null,
        kv('Proyecto', data.unidad.proyecto_nombre ?? '—'),
        kv('Número', data.unidad.numero ?? '—'),
        kv('Tipo', data.unidad.tipo ?? '—'),
        kv('Área', data.unidad.area_m2 != null ? `${data.unidad.area_m2} m²` : '—'),
        kv('Precio lista', fmtMxn(data.unidad.price_mxn)),
      ),
      createElement(Text, { style: styles.sectionTitle }, 'Esquema de pago'),
      createElement(
        View,
        null,
        kv('Esquema', data.esquema.nombre ?? 'Contado'),
        kv('Enganche', `${data.esquema.enganche_pct}% (${fmtMxn(data.montos.enganche_mxn)})`),
        kv(
          'Mensualidades',
          data.esquema.mensualidades_count > 0
            ? `${data.esquema.mensualidades_count} × ${fmtMxn(data.montos.mensualidad_mxn)}`
            : 'No aplica',
        ),
        kv(
          'Contra entrega',
          `${data.esquema.contra_entrega_pct}% (${fmtMxn(data.montos.contra_entrega_mxn)})`,
        ),
        kv('Comisión asesor', fmtMxn(data.montos.comision_asesor_mxn)),
        kv('IVA', fmtMxn(data.montos.iva_mxn)),
        kv('Total', fmtMxn(data.montos.total_mxn)),
      ),
      createElement(Text, { style: styles.sectionTitle }, 'Cuerpo legal'),
      ...bodies.map((b) => createElement(Text, { style: styles.paragraph }, b)),
      createElement(
        View,
        { style: styles.signatureBlock },
        createElement(
          Text,
          { style: styles.signatureLine },
          `${data.comprador.nombre ?? 'Comprador'}`,
        ),
        createElement(Text, { style: styles.signatureLine }, `${data.asesor.nombre ?? 'Asesor'}`),
        createElement(Text, { style: styles.signatureLine }, 'Desarrollador'),
      ),
      createElement(
        Text,
        { style: styles.disclaimerBadge },
        'Documento sin valor legal hasta firma electrónica certificada (Mifiel/DocuSign — disponible H2). Cláusulas sujetas a revisión jurídica final.',
      ),
    ),
  );
}

function kv(label: string, value: string): ReactElement {
  return createElement(
    View,
    { style: styles.kv },
    createElement(Text, { style: styles.kvLabel }, label),
    createElement(Text, { style: styles.kvValue }, value),
  );
}

export interface GenerateUnsignedPdfArgs {
  contractId: string;
  preFilledData: PreFilledContractData;
}

export interface GenerateUnsignedPdfResult {
  pdf_url: string;
  bytes: number;
  storage_path: string;
}

export async function generateUnsignedPDF(
  args: GenerateUnsignedPdfArgs,
): Promise<GenerateUnsignedPdfResult> {
  const element = buildContractElement(args.preFilledData);
  const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  const bytes = buffer.byteLength;
  const path = `contracts/${args.contractId}.pdf`;

  const admin = createAdminClient();
  const upload = await admin.storage.from('reports').upload(path, buffer, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (upload.error) {
    throw new Error(`pdf-generator upload failed: ${upload.error.message}`);
  }
  const { data: urlData } = admin.storage.from('reports').getPublicUrl(path);
  return { pdf_url: urlData.publicUrl ?? '', bytes, storage_path: path };
}
