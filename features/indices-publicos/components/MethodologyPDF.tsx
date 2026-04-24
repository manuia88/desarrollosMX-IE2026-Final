import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { IndexCode } from '@/shared/types/scores';
import type { MethodologyRow, WeightEntry } from '../lib/methodology-helpers';
import { normalizeWeightsToPercent } from '../lib/methodology-helpers';

export interface MethodologyPDFStrings {
  readonly coverTitle: string;
  readonly coverSubtitle: string;
  readonly versionLabel: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string;
  readonly weightsTitle: string;
  readonly formulaTitle: string;
  readonly changelogTitle: string;
  readonly generatedAt: string;
  readonly footerDisclaimer: string;
}

export interface MethodologyPDFProps {
  readonly indexCode: IndexCode;
  readonly active: MethodologyRow;
  readonly versions: ReadonlyArray<MethodologyRow>;
  readonly weights: ReadonlyArray<WeightEntry>;
  readonly strings: MethodologyPDFStrings;
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  coverTitle: {
    fontSize: 28,
    marginBottom: 8,
    fontFamily: 'Helvetica-Bold',
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 32,
  },
  badge: {
    fontSize: 12,
    color: '#444',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginTop: 24,
    marginBottom: 12,
    borderBottom: '1 solid #ddd',
    paddingBottom: 4,
  },
  weightsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottom: '0.5 solid #eee',
  },
  formula: {
    padding: 12,
    backgroundColor: '#f6f6f6',
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 10,
  },
  changelogItem: {
    marginBottom: 10,
    paddingLeft: 8,
    borderLeft: '2 solid #5b21b6',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 8,
    color: '#888',
    borderTop: '0.5 solid #ddd',
    paddingTop: 6,
  },
});

function formatPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

export function MethodologyPDF({
  indexCode,
  active,
  versions,
  weights,
  strings,
}: MethodologyPDFProps) {
  const normalized = normalizeWeightsToPercent(weights);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>{strings.coverTitle.replace('{code}', indexCode)}</Text>
        <Text style={styles.coverSubtitle}>{strings.coverSubtitle}</Text>

        <Text style={styles.badge}>
          {strings.versionLabel.replace('{version}', active.version)}
        </Text>
        <Text style={styles.badge}>
          {strings.effectiveFrom.replace('{date}', active.effective_from)}
        </Text>
        {active.effective_to ? (
          <Text style={styles.badge}>
            {strings.effectiveTo.replace('{date}', active.effective_to)}
          </Text>
        ) : null}
        <Text style={styles.badge}>{strings.generatedAt}</Text>

        <Text style={styles.sectionTitle}>{strings.weightsTitle}</Text>
        {normalized.length > 0 ? (
          normalized.map((w) => (
            <View key={w.key} style={styles.weightsRow}>
              <Text>{w.key}</Text>
              <Text>{formatPct(w.weight)}</Text>
            </View>
          ))
        ) : (
          <Text>—</Text>
        )}

        <Text style={styles.sectionTitle}>{strings.formulaTitle}</Text>
        <View style={styles.formula}>
          <Text>{active.formula_md}</Text>
        </View>

        {versions.length > 1 ? (
          <>
            <Text style={styles.sectionTitle}>{strings.changelogTitle}</Text>
            {versions.map((v) => (
              <View key={`${v.index_code}-${v.version}`} style={styles.changelogItem}>
                <Text>
                  {strings.versionLabel.replace('{version}', v.version)} —{' '}
                  {strings.effectiveFrom.replace('{date}', v.effective_from)}
                </Text>
                {v.changelog_notes ? (
                  <Text style={{ color: '#555', marginTop: 2 }}>{v.changelog_notes}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.footer} fixed>
          {strings.footerDisclaimer}
        </Text>
      </Page>
    </Document>
  );
}
