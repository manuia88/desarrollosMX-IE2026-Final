// FASE 11.J — Monthly MoM email template.
//
// TSX functional component + helper renderMonthlyMoMEmail que produce
// { html, text, subject }. NO usa MJML (evita dep nueva — regla founder).
// renderToStaticMarkup de react-dom/server ya está disponible vía react 19.

import type { ReactElement } from 'react';
import { renderToStaticMarkupSafe as renderToStaticMarkup } from '../lib/render-email';
import type {
  HeroTopEntry,
  MigrationSectionBundle,
  NewsletterLocale,
  NewsletterMonthlyBundle,
  NewsletterSubscriberRow,
  PulseSectionBundle,
  StreaksSectionBundle,
} from '../types';

export interface MonthlyMoMTemplateProps {
  readonly bundle: NewsletterMonthlyBundle;
  readonly subscriberEmail: string;
  readonly unsubscribeUrl: string;
  readonly preferencesUrl: string;
  readonly periodLabel: string;
}

function HeroTop({ hero }: { readonly hero: readonly HeroTopEntry[] }): ReactElement | null {
  if (hero.length === 0) return null;
  return (
    <section>
      <h2 style={{ fontSize: 18, margin: '24px 0 12px' }}>Top 5 del mes</h2>
      <table
        role="presentation"
        cellPadding={8}
        cellSpacing={0}
        width="100%"
        style={{ borderCollapse: 'collapse', fontSize: 14 }}
      >
        <thead>
          <tr style={{ background: '#f6f6f6' }}>
            <th align="left">#</th>
            <th align="left">Zona</th>
            <th align="right">Valor</th>
            <th align="right">Δ</th>
          </tr>
        </thead>
        <tbody>
          {hero.map((row) => (
            <tr key={`${row.scope_type}:${row.scope_id}`} style={{ borderTop: '1px solid #eee' }}>
              <td>{row.rank}</td>
              <td>{row.zone_label}</td>
              <td align="right">{row.value.toFixed(2)}</td>
              <td align="right">{row.delta_pct !== null ? `${row.delta_pct.toFixed(1)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CausalParagraphs({
  paragraphs,
}: {
  readonly paragraphs: readonly string[];
}): ReactElement | null {
  if (paragraphs.length === 0) return null;
  return (
    <section style={{ margin: '24px 0' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>¿Por qué pasó esto?</h2>
      {paragraphs.map((p) => (
        <p key={p.slice(0, 48)} style={{ margin: '0 0 12px', lineHeight: 1.5 }}>
          {p}
        </p>
      ))}
    </section>
  );
}

function PulseSection({
  section,
}: {
  readonly section: PulseSectionBundle | null;
}): ReactElement | null {
  if (!section) return null;
  return (
    <section style={{ margin: '24px 0' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Pulso en {section.zone_label}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>
        Pulso actual: <strong>{section.current_pulse.toFixed(1)}</strong>
        {section.delta_4w !== null ? ` (${section.delta_4w.toFixed(1)} vs hace 4 semanas)` : ''}
      </p>
      <p style={{ marginTop: 8, fontSize: 13 }}>
        <a href={section.detail_url} style={{ color: '#1a73e8' }}>
          Ver pulso completo →
        </a>
      </p>
    </section>
  );
}

function MigrationSection({
  section,
}: {
  readonly section: MigrationSectionBundle | null;
}): ReactElement | null {
  if (!section) return null;
  if (section.top_origins.length === 0 && section.top_destinations.length === 0) return null;
  return (
    <section style={{ margin: '24px 0' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Flujos migratorios — {section.zone_label}</h2>
      {section.top_origins.length > 0 ? (
        <>
          <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Top orígenes (entran)</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {section.top_origins.map((o) => (
              <li key={o.scope_id}>
                {o.zone_label} — {o.volume.toLocaleString('es-MX')} ({o.share_pct.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {section.top_destinations.length > 0 ? (
        <>
          <h3 style={{ fontSize: 14, margin: '12px 0 6px' }}>Top destinos (salen)</h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {section.top_destinations.map((d) => (
              <li key={d.scope_id}>
                {d.zone_label} — {d.volume.toLocaleString('es-MX')} ({d.share_pct.toFixed(1)}%)
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <p style={{ marginTop: 8, fontSize: 13 }}>
        <a href={section.detail_url} style={{ color: '#1a73e8' }}>
          Ver flujos completos →
        </a>
      </p>
    </section>
  );
}

function StreaksSectionView({
  section,
}: {
  readonly section: StreaksSectionBundle | null;
}): ReactElement | null {
  if (!section || section.top_streaks.length === 0) return null;
  return (
    <section style={{ margin: '24px 0' }}>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Zonas con racha activa</h2>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
        {section.top_streaks.map((s) => (
          <li key={s.id}>
            {s.scope_id} — {s.streak_length_months} meses consecutivos
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MonthlyMoMTemplate(props: MonthlyMoMTemplateProps): ReactElement {
  const { bundle, subscriberEmail, unsubscribeUrl, preferencesUrl, periodLabel } = props;
  return (
    <html lang={bundle.locale}>
      {/* biome-ignore lint/style/noHeadElement: HTML email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <title>DesarrollosMX — {periodLabel}</title>
      </head>
      <body
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
          background: '#ffffff',
          color: '#111',
        }}
      >
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          width="100%"
          style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}
        >
          <tbody>
            <tr>
              <td>
                <header style={{ borderBottom: '1px solid #eee', paddingBottom: 16 }}>
                  <h1 style={{ fontSize: 22, margin: 0 }}>DesarrollosMX</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{periodLabel}</p>
                </header>

                <HeroTop hero={bundle.hero_top_five} />
                <CausalParagraphs paragraphs={bundle.causal_paragraphs} />
                <PulseSection section={bundle.pulse_section} />
                <MigrationSection section={bundle.migration_section} />
                <StreaksSectionView section={bundle.streaks_section} />

                <section style={{ margin: '32px 0', textAlign: 'center' }}>
                  <a
                    href={bundle.cta.url}
                    style={{
                      display: 'inline-block',
                      background: '#111',
                      color: '#fff',
                      textDecoration: 'none',
                      padding: '12px 24px',
                      borderRadius: 6,
                      fontWeight: 600,
                    }}
                  >
                    {bundle.cta.label}
                  </a>
                </section>

                <footer
                  style={{
                    borderTop: '1px solid #eee',
                    paddingTop: 16,
                    fontSize: 12,
                    color: '#777',
                    lineHeight: 1.5,
                  }}
                >
                  <p style={{ margin: '0 0 8px' }}>
                    Enviado a {subscriberEmail}. DesarrollosMX respeta tu privacidad bajo LFPDPPP
                    (MX) + CAN-SPAM (US).
                  </p>
                  <p style={{ margin: 0 }}>
                    <a href={preferencesUrl} style={{ color: '#777' }}>
                      Gestionar preferencias
                    </a>
                    {' · '}
                    <a href={unsubscribeUrl} style={{ color: '#777' }}>
                      Darme de baja
                    </a>
                  </p>
                </footer>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// ---------- Render helpers ----------

export interface RenderMonthlyMoMResult {
  readonly html: string;
  readonly text: string;
  readonly subject: string;
}

export interface RenderMonthlyMoMOpts {
  readonly bundle: NewsletterMonthlyBundle;
  readonly subscriber: Pick<NewsletterSubscriberRow, 'email'>;
  readonly unsubscribeUrl: string;
  readonly preferencesUrl: string;
  readonly subjectOverride?: string;
}

function formatPeriodLabel(periodDate: string, locale: NewsletterLocale): string {
  // YYYY-MM-DD → locale-aware month + year.
  const d = new Date(`${periodDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return periodDate;
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
  } catch {
    return periodDate;
  }
}

function defaultSubject(periodLabel: string): string {
  return `${periodLabel} — Los 5 movimientos del mes en bienes raíces MX`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderMonthlyMoMEmail(opts: RenderMonthlyMoMOpts): RenderMonthlyMoMResult {
  const periodLabel = formatPeriodLabel(opts.bundle.period_date, opts.bundle.locale);
  const element = (
    <MonthlyMoMTemplate
      bundle={opts.bundle}
      subscriberEmail={opts.subscriber.email}
      unsubscribeUrl={opts.unsubscribeUrl}
      preferencesUrl={opts.preferencesUrl}
      periodLabel={periodLabel}
    />
  );
  const body = renderToStaticMarkup(element);
  const html = `<!doctype html>${body}`;
  const text = stripHtml(html);
  const subject = opts.subjectOverride ?? defaultSubject(periodLabel);
  return { html, text, subject };
}
