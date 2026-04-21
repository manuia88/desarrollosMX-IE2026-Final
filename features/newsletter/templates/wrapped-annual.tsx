// FASE 11.J.2 — Wrapped annual email (1 enero) — link a landing page.

import type { ReactElement } from 'react';
import { renderToStaticMarkupSafe as renderToStaticMarkup } from '../lib/render-email';
import type { NewsletterLocale } from '../types';

export interface WrappedAnnualEmailProps {
  readonly locale: NewsletterLocale;
  readonly year: number;
  readonly wrappedUrl: string;
  readonly subscriberEmail: string;
  readonly unsubscribeUrl: string;
}

export function WrappedAnnualTemplate(props: WrappedAnnualEmailProps): ReactElement {
  return (
    <html lang={props.locale}>
      {/* biome-ignore lint/style/noHeadElement: HTML email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <title>DMX Wrapped {props.year}</title>
      </head>
      <body
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
          background: '#0a0a0a',
          color: '#fff',
        }}
      >
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          width="100%"
          style={{ maxWidth: 560, margin: '0 auto', padding: 32 }}
        >
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: 36, margin: '0 0 8px', fontWeight: 800 }}>
                  DMX Wrapped {props.year}
                </h1>
                <p style={{ margin: '0 0 24px', fontSize: 16, color: '#bbb', lineHeight: 1.5 }}>
                  Los números que definieron el año en bienes raíces en México.
                </p>
                <p style={{ margin: '24px 0' }}>
                  <a
                    href={props.wrappedUrl}
                    style={{
                      display: 'inline-block',
                      background: '#fff',
                      color: '#0a0a0a',
                      textDecoration: 'none',
                      padding: '14px 32px',
                      borderRadius: 999,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  >
                    Ver mi Wrapped {props.year}
                  </a>
                </p>
                <p style={{ margin: '32px 0 0', fontSize: 12, color: '#777', lineHeight: 1.5 }}>
                  Enviado a {props.subscriberEmail}.{' '}
                  <a href={props.unsubscribeUrl} style={{ color: '#777' }}>
                    Darme de baja
                  </a>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export interface RenderWrappedAnnualResult {
  readonly html: string;
  readonly text: string;
  readonly subject: string;
}

export function renderWrappedAnnual(props: WrappedAnnualEmailProps): RenderWrappedAnnualResult {
  const body = renderToStaticMarkup(<WrappedAnnualTemplate {...props} />);
  const html = `<!doctype html>${body}`;
  const text = [
    `DMX Wrapped ${props.year} está listo.`,
    '',
    `Verlo: ${props.wrappedUrl}`,
    '',
    `Unsubscribe: ${props.unsubscribeUrl}`,
  ].join('\n');
  return {
    html,
    text,
    subject: `DMX Wrapped ${props.year} — Tu año en bienes raíces MX`,
  };
}
