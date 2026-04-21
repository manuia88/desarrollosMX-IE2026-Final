// features/newsletter/templates/zone-personalized.tsx
//
// BLOQUE 11.J.3 — Template TSX funcional para newsletter personalizado por
// colonia. Render via renderToStaticMarkup desde el send-orchestrator (A).

import type {
  MigrationFlowEntry,
  NewsletterMonthlyBundle,
  ZoneStreakRow,
} from '@/features/newsletter/types';

export interface ZonePersonalizedTemplateProps {
  readonly bundle: NewsletterMonthlyBundle;
  readonly subscriberZoneLabels: ReadonlyArray<string>;
  readonly unsubscribeUrl: string;
  readonly preferencesUrl: string;
}

function HeroSection({
  zoneLabels,
  periodDate,
}: {
  readonly zoneLabels: ReadonlyArray<string>;
  readonly periodDate: string;
}) {
  const count = zoneLabels.length;
  const joined = zoneLabels.join(', ');
  const title =
    count === 0
      ? `Tu resumen mensual — ${periodDate}`
      : count === 1
        ? `Tu resumen de ${joined} — ${periodDate}`
        : `Tu resumen de ${count} zonas: ${joined} — ${periodDate}`;
  return (
    <tr>
      <td style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ margin: 0, fontSize: '22px', color: '#111' }}>{title}</h1>
      </td>
    </tr>
  );
}

function TopFiveTable({ bundle }: { readonly bundle: NewsletterMonthlyBundle }) {
  if (bundle.hero_top_five.length === 0) return null;
  return (
    <tr>
      <td style={{ padding: '16px 24px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#333' }}>
          Top 5 del mes en tus zonas
        </h2>
        <table
          width="100%"
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: 'collapse', width: '100%' }}
        >
          <tbody>
            {bundle.hero_top_five.map((row) => (
              <tr key={`${row.scope_type}:${row.scope_id}`}>
                <td
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid #eee',
                    fontSize: '14px',
                  }}
                >
                  #{row.rank} {row.zone_label}
                </td>
                <td
                  align="right"
                  style={{
                    padding: '6px 0',
                    borderBottom: '1px solid #eee',
                    fontSize: '14px',
                    color: '#555',
                  }}
                >
                  {row.value.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function PulseBlock({ bundle }: { readonly bundle: NewsletterMonthlyBundle }) {
  const p = bundle.pulse_section;
  if (p === null) return null;
  return (
    <tr>
      <td style={{ padding: '16px 24px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#333' }}>
          Pulse — {p.zone_label}
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
          Pulse actual: {p.current_pulse.toFixed(1)}
          {p.delta_4w !== null
            ? ` (${p.delta_4w >= 0 ? '+' : ''}${p.delta_4w.toFixed(1)} vs 4 semanas)`
            : ''}
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
          <a href={p.detail_url}>Ver detalle →</a>
        </p>
      </td>
    </tr>
  );
}

function FlowList({
  title,
  rows,
}: {
  readonly title: string;
  readonly rows: ReadonlyArray<MigrationFlowEntry>;
}) {
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <h3 style={{ fontSize: '14px', margin: '0 0 6px 0', color: '#333' }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        {rows.map((r) => (
          <li key={r.scope_id} style={{ fontSize: '13px', color: '#555' }}>
            {r.zone_label} — {r.volume.toLocaleString()} ({r.share_pct.toFixed(1)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

function MigrationBlock({ bundle }: { readonly bundle: NewsletterMonthlyBundle }) {
  const m = bundle.migration_section;
  if (m === null) return null;
  const hasFlows = m.top_origins.length > 0 || m.top_destinations.length > 0;
  return (
    <tr>
      <td style={{ padding: '16px 24px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#333' }}>
          Flujos migratorios — {m.zone_label}
        </h2>
        {hasFlows ? (
          <>
            <FlowList title="Vienen desde" rows={m.top_origins} />
            <FlowList title="Se mueven hacia" rows={m.top_destinations} />
            <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
              <a href={m.detail_url}>Ver mapa completo →</a>
            </p>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: '#777' }}>
            Aún no tenemos datos suficientes de flujos para esta zona.
          </p>
        )}
      </td>
    </tr>
  );
}

function StreaksBlock({ bundle }: { readonly bundle: NewsletterMonthlyBundle }) {
  const s = bundle.streaks_section;
  if (s === null || s.top_streaks.length === 0) return null;
  return (
    <tr>
      <td style={{ padding: '16px 24px' }}>
        <h2 style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#333' }}>
          Las más vivas este trimestre
        </h2>
        <ol style={{ margin: 0, paddingLeft: '18px' }}>
          {s.top_streaks.slice(0, 10).map((row: ZoneStreakRow) => (
            <li
              key={`${row.scope_type}:${row.scope_id}`}
              style={{ fontSize: '13px', color: '#555', padding: '2px 0' }}
            >
              {row.scope_id} — {row.streak_length_months} meses consecutivos (pulse{' '}
              {row.current_pulse.toFixed(1)})
            </li>
          ))}
        </ol>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
          <a href={s.detail_url}>Ver ranking completo →</a>
        </p>
      </td>
    </tr>
  );
}

function Footer({
  preferencesUrl,
  unsubscribeUrl,
}: {
  readonly preferencesUrl: string;
  readonly unsubscribeUrl: string;
}) {
  return (
    <tr>
      <td
        style={{
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#888',
          borderTop: '1px solid #eee',
        }}
      >
        <p style={{ margin: 0 }}>
          <a href={preferencesUrl}>Cambiar tus preferencias</a> ·{' '}
          <a href={unsubscribeUrl}>Darte de baja</a>
        </p>
      </td>
    </tr>
  );
}

export function ZonePersonalizedTemplate(props: ZonePersonalizedTemplateProps) {
  const { bundle, subscriberZoneLabels, preferencesUrl, unsubscribeUrl } = props;
  return (
    <html lang={bundle.locale}>
      {/* biome-ignore lint/style/noHeadElement: HTML email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <title>Newsletter DesarrollosMX</title>
      </head>
      <body style={{ margin: 0, backgroundColor: '#f6f6f6' }}>
        <table
          width="100%"
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: '#f6f6f6', padding: '24px 0' }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  width="600"
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    maxWidth: '600px',
                  }}
                >
                  <tbody>
                    <HeroSection
                      zoneLabels={subscriberZoneLabels}
                      periodDate={bundle.period_date}
                    />
                    <TopFiveTable bundle={bundle} />
                    <PulseBlock bundle={bundle} />
                    <MigrationBlock bundle={bundle} />
                    <StreaksBlock bundle={bundle} />
                    <Footer preferencesUrl={preferencesUrl} unsubscribeUrl={unsubscribeUrl} />
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export default ZonePersonalizedTemplate;
