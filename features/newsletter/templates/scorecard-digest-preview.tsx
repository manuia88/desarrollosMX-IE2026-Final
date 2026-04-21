// BLOQUE 11.J.6 — Scorecard digest PREVIEW template (teaser pre-publicación).
//
// Envío ~2 meses antes del release_date. Header: "En 2 meses publicamos",
// cuerpo: preview_paragraph (snippet executive summary), CTA:
// "Pre-registrate para acceso early".
//
// Patrón: renderScorecardDigestPreviewEmail(bundle, subscriber) → {html, text, subject}
// usando renderToStaticMarkup (igual que A). Zero CSS externo, inline styles
// safe para Gmail/Outlook/Apple Mail. NO emojis en template code — son chars
// literales en strings autorizados por copy (subject line incluye 🔜).

import { renderToStaticMarkupSafe as renderToStaticMarkup } from '../lib/render-email';
import type { NewsletterLocale, ScorecardDigestBundle } from '../types';

export interface DigestSubscriberLike {
  readonly email: string;
  readonly locale: NewsletterLocale;
  readonly unsubscribe_token_hash: string | null;
}

export interface RenderResult {
  readonly html: string;
  readonly text: string;
  readonly subject: string;
}

// Localized copy keys (hardcoded fallback — a server-side i18n resolver
// se hooked post — la estructura vive en messages/*.json Newsletter.scorecard.*).
// El mapa aquí es tolerante a locales faltantes: cae a es-MX.
const COPY: Readonly<
  Record<
    NewsletterLocale,
    {
      headerLead: string;
      headerTrail: (period: string) => string;
      previewLabel: string;
      ctaLabel: string;
      footerLegal: string;
      subjectTemplate: (period: string) => string;
    }
  >
> = {
  'es-MX': {
    headerLead: 'En 2 meses publicamos',
    headerTrail: (p) => `el Scorecard Nacional ${p}`,
    previewLabel: 'Vista previa del resumen ejecutivo',
    ctaLabel: 'Pre-regístrate para acceso early',
    footerLegal: 'Recibiste este correo porque te suscribiste al newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `🔜 ${p} Scorecard llega en 2 meses`,
  },
  'es-CO': {
    headerLead: 'En 2 meses publicamos',
    headerTrail: (p) => `el Scorecard Nacional ${p}`,
    previewLabel: 'Vista previa del resumen ejecutivo',
    ctaLabel: 'Pre-regístrate para acceso early',
    footerLegal: 'Recibiste este correo porque te suscribiste al newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `🔜 ${p} Scorecard llega en 2 meses`,
  },
  'es-AR': {
    headerLead: 'En 2 meses publicamos',
    headerTrail: (p) => `el Scorecard Nacional ${p}`,
    previewLabel: 'Vista previa del resumen ejecutivo',
    ctaLabel: 'Pre-regístrate para acceso anticipado',
    footerLegal: 'Recibiste este correo porque te suscribiste al newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `🔜 ${p} Scorecard llega en 2 meses`,
  },
  'pt-BR': {
    headerLead: 'Em 2 meses publicamos',
    headerTrail: (p) => `o Scorecard Nacional ${p}`,
    previewLabel: 'Prévia do resumo executivo',
    ctaLabel: 'Pré-cadastre-se para acesso antecipado',
    footerLegal: 'Você recebeu este email porque se inscreveu na newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `🔜 ${p} Scorecard em 2 meses`,
  },
  'en-US': {
    headerLead: 'In 2 months we publish',
    headerTrail: (p) => `the ${p} National Scorecard`,
    previewLabel: 'Executive summary preview',
    ctaLabel: 'Pre-register for early access',
    footerLegal: 'You received this email because you subscribed to the DesarrollosMX newsletter.',
    subjectTemplate: (p) => `🔜 ${p} Scorecard drops in 2 months`,
  },
};

function pickCopy(locale: NewsletterLocale): (typeof COPY)['es-MX'] {
  return COPY[locale] ?? COPY['es-MX'];
}

// Format period label desde period_date YYYY-MM-DD (quarterly).
export function periodLabelFromDigest(bundle: ScorecardDigestBundle): string {
  const year = bundle.period_date.slice(0, 4);
  const month = Number.parseInt(bundle.period_date.slice(5, 7), 10);
  const q = Math.floor((month - 1) / 3) + 1;
  return `${year} Q${q}`;
}

function ScorecardDigestPreviewEmail(props: {
  bundle: ScorecardDigestBundle;
  subscriber: DigestSubscriberLike;
  period: string;
}) {
  const { bundle, subscriber, period } = props;
  const copy = pickCopy(subscriber.locale);

  return (
    <html lang={subscriber.locale}>
      {/* biome-ignore lint/style/noHeadElement: HTML email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{bundle.headline}</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: '#f6f8fb',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: '#0f172a',
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: '#f6f8fb' }}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: '32px 16px' }}>
                <table
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
                    maxWidth: 600,
                    width: '100%',
                  }}
                >
                  <tbody>
                    <tr>
                      <td
                        style={{
                          padding: '28px 32px 8px 32px',
                          borderBottom: '1px solid #eef2f7',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 12,
                            lineHeight: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#475569',
                            margin: 0,
                          }}
                        >
                          DesarrollosMX · Scorecard Nacional
                        </p>
                        <h1
                          style={{
                            fontSize: 22,
                            lineHeight: '30px',
                            margin: '8px 0 4px 0',
                            color: '#0f172a',
                          }}
                        >
                          {copy.headerLead} {copy.headerTrail(period)}
                        </h1>
                        <p
                          style={{
                            fontSize: 14,
                            lineHeight: '22px',
                            color: '#475569',
                            margin: 0,
                          }}
                        >
                          {bundle.headline}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '24px 32px 8px 32px' }}>
                        <p
                          style={{
                            fontSize: 12,
                            lineHeight: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: '#2f7bff',
                            margin: '0 0 12px 0',
                          }}
                        >
                          {copy.previewLabel}
                        </p>
                        <p
                          style={{
                            fontSize: 15,
                            lineHeight: '24px',
                            color: '#0f172a',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {bundle.preview_paragraph}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style={{ padding: '24px 32px 32px 32px' }}>
                        <a
                          href={bundle.cta_url}
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#ffffff',
                            textDecoration: 'none',
                            padding: '12px 24px',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 600,
                            display: 'inline-block',
                          }}
                        >
                          {copy.ctaLabel}
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: '20px 32px',
                          borderTop: '1px solid #eef2f7',
                          fontSize: 12,
                          lineHeight: '18px',
                          color: '#64748b',
                        }}
                      >
                        <p style={{ margin: 0 }}>
                          {copy.footerLegal}
                          <br />
                          <span style={{ color: '#94a3b8' }}>{subscriber.email}</span>
                        </p>
                      </td>
                    </tr>
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

// Fallback texto plano simple derivado del bundle. Email clients sin HTML
// lo mostrarán. NO carga CSS, sólo newlines.
function buildPlainText(
  bundle: ScorecardDigestBundle,
  subscriber: DigestSubscriberLike,
  period: string,
): string {
  const copy = pickCopy(subscriber.locale);
  return [
    `${copy.headerLead} ${copy.headerTrail(period)}`,
    '',
    bundle.headline,
    '',
    bundle.preview_paragraph,
    '',
    `${copy.ctaLabel}: ${bundle.cta_url}`,
    '',
    '---',
    copy.footerLegal,
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

export function renderScorecardDigestPreviewEmail(
  bundle: ScorecardDigestBundle,
  subscriber: DigestSubscriberLike,
): RenderResult {
  const period = periodLabelFromDigest(bundle);
  const copy = pickCopy(subscriber.locale);
  const html = renderToStaticMarkup(
    <ScorecardDigestPreviewEmail bundle={bundle} subscriber={subscriber} period={period} />,
  );
  const text = buildPlainText(bundle, subscriber, period);
  const subject = copy.subjectTemplate(period);
  return { html: `<!DOCTYPE html>${html}`, text, subject };
}
