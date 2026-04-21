// BLOQUE 11.J.6 — Scorecard digest POST-publish template.
//
// Header: "Publicamos {title}" — recap con top 3 hallazgos + botón compartir
// LinkedIn (mailto fallback para clientes sin plugin). Subject: "📊 {period}
// Scorecard ya está listo".
//
// Also re-exports renderScorecardDigestPreviewEmail desde el módulo preview
// (conveniencia para sender; sender hace explicit path-based imports pero
// este re-export evita consumers externos teniendo que importar de 2 archivos).

import { renderToStaticMarkupSafe as renderToStaticMarkup } from '../lib/render-email';
import type { NewsletterLocale, ScorecardDigestBundle } from '../types';
import {
  type DigestSubscriberLike,
  periodLabelFromDigest,
  type RenderResult,
  renderScorecardDigestPreviewEmail,
} from './scorecard-digest-preview';

export type { DigestSubscriberLike, RenderResult };
export { renderScorecardDigestPreviewEmail };

const POST_COPY: Readonly<
  Record<
    NewsletterLocale,
    {
      headerLead: (title: string) => string;
      recapLabel: string;
      findingsLabel: string;
      ctaLabel: string;
      shareLabel: string;
      footerLegal: string;
      subjectTemplate: (period: string) => string;
    }
  >
> = {
  'es-MX': {
    headerLead: (t) => `Publicamos ${t}`,
    recapLabel: 'Recap del trimestre',
    findingsLabel: 'Lo más importante',
    ctaLabel: 'Lee el reporte completo',
    shareLabel: 'Compartir en LinkedIn',
    footerLegal: 'Recibiste este correo porque te suscribiste al newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `📊 ${p} Scorecard ya está listo`,
  },
  'es-CO': {
    headerLead: (t) => `Publicamos ${t}`,
    recapLabel: 'Resumen del trimestre',
    findingsLabel: 'Lo más importante',
    ctaLabel: 'Lee el reporte completo',
    shareLabel: 'Compartir en LinkedIn',
    footerLegal: 'Recibiste este correo porque te suscribiste al newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `📊 ${p} Scorecard ya está listo`,
  },
  'es-AR': {
    headerLead: (t) => `Publicamos ${t}`,
    recapLabel: 'Resumen del trimestre',
    findingsLabel: 'Lo más importante',
    ctaLabel: 'Leé el reporte completo',
    shareLabel: 'Compartir en LinkedIn',
    footerLegal: 'Recibiste este correo porque te suscribiste al newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `📊 ${p} Scorecard ya está disponible`,
  },
  'pt-BR': {
    headerLead: (t) => `Publicamos ${t}`,
    recapLabel: 'Recap do trimestre',
    findingsLabel: 'Principais pontos',
    ctaLabel: 'Leia o relatório completo',
    shareLabel: 'Compartilhar no LinkedIn',
    footerLegal: 'Você recebeu este email porque se inscreveu na newsletter de DesarrollosMX.',
    subjectTemplate: (p) => `📊 ${p} Scorecard já está disponível`,
  },
  'en-US': {
    headerLead: (t) => `We just published ${t}`,
    recapLabel: 'Quarter recap',
    findingsLabel: 'Top findings',
    ctaLabel: 'Read the full report',
    shareLabel: 'Share on LinkedIn',
    footerLegal: 'You received this email because you subscribed to the DesarrollosMX newsletter.',
    subjectTemplate: (p) => `📊 ${p} Scorecard is live`,
  },
};

function pickPostCopy(locale: NewsletterLocale): (typeof POST_COPY)['es-MX'] {
  return POST_COPY[locale] ?? POST_COPY['es-MX'];
}

// Deriva 3 findings desde el snippet paragraph: si hay bullets (•, -, 1.) los
// extrae; si no, parte en oraciones y toma las primeras 3. Fallback mínimo si
// el párrafo está vacío.
export function deriveTopFindings(paragraph: string): readonly string[] {
  if (!paragraph) return [];
  const normalized = paragraph
    .replace(/\r/g, '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const bullets: string[] = [];
  for (const line of normalized) {
    const m = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/);
    if (m?.[1]) bullets.push(m[1].trim());
    if (bullets.length === 3) break;
  }
  if (bullets.length > 0) return bullets;

  const sentences = paragraph
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, 3);
}

// LinkedIn share URL: usa intent share feed con url+source. Compatible email.
export function buildLinkedInShareUrl(ctaUrl: string, headline: string): string {
  const params = new URLSearchParams({
    url: ctaUrl,
    title: headline,
    source: 'DesarrollosMX',
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

// Mailto fallback: crea mailto:?subject=...&body=... con el link al reporte.
export function buildMailtoFallback(ctaUrl: string, headline: string): string {
  const subject = encodeURIComponent(headline);
  const body = encodeURIComponent(`${headline}\n\n${ctaUrl}`);
  return `mailto:?subject=${subject}&body=${body}`;
}

function ScorecardDigestPostEmail(props: {
  bundle: ScorecardDigestBundle;
  subscriber: DigestSubscriberLike;
  period: string;
  findings: readonly string[];
  linkedInUrl: string;
}) {
  const { bundle, subscriber, period, findings, linkedInUrl } = props;
  const copy = pickPostCopy(subscriber.locale);
  const title = `${period} Scorecard Nacional`;

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
                          {copy.headerLead(title)}
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
                          {copy.recapLabel}
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
                    {findings.length > 0 ? (
                      <tr>
                        <td style={{ padding: '16px 32px 8px 32px' }}>
                          <p
                            style={{
                              fontSize: 13,
                              lineHeight: '20px',
                              fontWeight: 600,
                              color: '#0f172a',
                              margin: '0 0 8px 0',
                            }}
                          >
                            {copy.findingsLabel}
                          </p>
                          <ol
                            style={{
                              paddingLeft: 20,
                              margin: 0,
                              fontSize: 14,
                              lineHeight: '22px',
                              color: '#0f172a',
                            }}
                          >
                            {findings.map((f, idx) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: findings are ephemeral email content
                              <li key={idx} style={{ marginBottom: 6 }}>
                                {f}
                              </li>
                            ))}
                          </ol>
                        </td>
                      </tr>
                    ) : null}
                    <tr>
                      <td align="center" style={{ padding: '24px 32px 8px 32px' }}>
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
                      <td align="center" style={{ padding: '4px 32px 28px 32px' }}>
                        <a
                          href={linkedInUrl}
                          style={{
                            color: '#2f7bff',
                            textDecoration: 'underline',
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {copy.shareLabel}
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

function buildPlainText(
  bundle: ScorecardDigestBundle,
  subscriber: DigestSubscriberLike,
  period: string,
  findings: readonly string[],
): string {
  const copy = pickPostCopy(subscriber.locale);
  const lines: string[] = [
    copy.headerLead(`${period} Scorecard Nacional`),
    '',
    bundle.headline,
    '',
    bundle.preview_paragraph,
    '',
  ];
  if (findings.length > 0) {
    lines.push(copy.findingsLabel);
    for (let i = 0; i < findings.length; i += 1) {
      lines.push(`${i + 1}. ${findings[i]}`);
    }
    lines.push('');
  }
  lines.push(`${copy.ctaLabel}: ${bundle.cta_url}`);
  lines.push('');
  lines.push('---');
  lines.push(copy.footerLegal);
  return lines.join('\n');
}

export function renderScorecardDigestPostEmail(
  bundle: ScorecardDigestBundle,
  subscriber: DigestSubscriberLike,
): RenderResult {
  const period = periodLabelFromDigest(bundle);
  const copy = pickPostCopy(subscriber.locale);
  const findings = deriveTopFindings(bundle.preview_paragraph);
  const linkedInUrl = buildLinkedInShareUrl(bundle.cta_url, bundle.headline);
  const html = renderToStaticMarkup(
    <ScorecardDigestPostEmail
      bundle={bundle}
      subscriber={subscriber}
      period={period}
      findings={findings}
      linkedInUrl={linkedInUrl}
    />,
  );
  const text = buildPlainText(bundle, subscriber, period, findings);
  const subject = copy.subjectTemplate(period);
  return { html: `<!DOCTYPE html>${html}`, text, subject };
}
