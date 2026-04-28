// F14.F.8 Sprint 7 BIBLIA Upgrade 4 — PDF renderer (@react-pdf/renderer).

import { Document, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import type { AnalyticsReportData } from './index';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    color: '#0F172A',
  },
  cover: {
    marginBottom: 32,
    borderBottom: '2px solid #6366F1',
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 6, color: '#6366F1' },
  subtitle: { fontSize: 13, color: '#64748B' },
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E293B',
    borderBottom: '1px solid #E2E8F0',
    paddingBottom: 4,
  },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #E2E8F0',
  },
  kpiLabel: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  list: { marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { color: '#475569' },
  rowValue: { fontWeight: 'bold' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export async function renderPdf(data: AnalyticsReportData): Promise<Uint8Array> {
  const document = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: 'A4', style: styles.page },
      createElement(
        View,
        { style: styles.cover },
        createElement(Text, { style: styles.title }, 'Reporte de Performance'),
        createElement(Text, { style: styles.subtitle }, `${data.userName} · ${data.periodLabel}`),
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'KPIs principales'),
        createElement(
          View,
          { style: styles.kpiRow },
          kpi('Videos generados', String(data.totalProjects)),
          kpi('Archivos rendered', String(data.totalRendered)),
          kpi('Costo total USD', `$${data.totalCostsUsd.toFixed(2)}`),
          kpi('Leads desde galería', String(data.totalReferrals)),
          kpi('Visitas galería', String(data.viewsTotal)),
          kpi('Rating promedio', data.avgRating ? `${data.avgRating}/5` : 'sin data'),
        ),
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Hooks más utilizados'),
        breakdownList(data.hookBreakdown.map((h) => ({ name: h.hook, count: h.count }))),
      ),
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, 'Formatos preferidos'),
        breakdownList(data.formatBreakdown.map((f) => ({ name: f.format, count: f.count }))),
      ),
      createElement(
        Text,
        { style: styles.footer, fixed: true },
        'Generado por DMX Studio · desarrollosmx.com',
      ),
    ),
  );

  const buffer = await renderToBuffer(document);
  return new Uint8Array(buffer);
}

function kpi(label: string, value: string) {
  return createElement(
    View,
    { style: styles.kpiCard },
    createElement(Text, { style: styles.kpiLabel }, label),
    createElement(Text, { style: styles.kpiValue }, value),
  );
}

function breakdownList(rows: ReadonlyArray<{ name: string; count: number }>) {
  if (rows.length === 0) {
    return createElement(Text, { style: styles.rowLabel }, 'Sin datos en el período');
  }
  return createElement(
    View,
    { style: styles.list },
    ...rows.map((row) =>
      createElement(
        View,
        { style: styles.row, key: row.name },
        createElement(Text, { style: styles.rowLabel }, row.name),
        createElement(Text, { style: styles.rowValue }, String(row.count)),
      ),
    ),
  );
}
