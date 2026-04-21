// FASE 11.J.10 — Unsubscribe confirmation email (confirma baja + CAN-SPAM compliance).

import type { ReactElement } from 'react';
import { renderToStaticMarkupSafe as renderToStaticMarkup } from '../lib/render-email';
import type { NewsletterLocale } from '../types';

export interface UnsubscribeConfirmProps {
  readonly locale: NewsletterLocale;
  readonly subscriberEmail: string;
  readonly resubscribeUrl: string;
}

export function UnsubscribeConfirmTemplate(props: UnsubscribeConfirmProps): ReactElement {
  return (
    <html lang={props.locale}>
      {/* biome-ignore lint/style/noHeadElement: HTML email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <title>Baja confirmada — DesarrollosMX</title>
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
          style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}
        >
          <tbody>
            <tr>
              <td>
                <h1 style={{ fontSize: 22, margin: '0 0 16px' }}>Baja confirmada</h1>
                <p style={{ margin: '0 0 16px', lineHeight: 1.5 }}>
                  Hemos procesado tu solicitud de baja para <strong>{props.subscriberEmail}</strong>
                  . Ya no recibirás nuestros newsletters.
                </p>
                <p style={{ margin: '0 0 24px', lineHeight: 1.5 }}>
                  Si fue un error, puedes volver a suscribirte cuando gustes:
                </p>
                <p style={{ textAlign: 'center', margin: '0 0 24px' }}>
                  <a
                    href={props.resubscribeUrl}
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
                    Volver a suscribirme
                  </a>
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#777', lineHeight: 1.5 }}>
                  Conforme a LFPDPPP (MX) y CAN-SPAM (US), tu baja es inmediata y gratuita.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export interface RenderUnsubscribeConfirmResult {
  readonly html: string;
  readonly text: string;
  readonly subject: string;
}

export function renderUnsubscribeConfirm(
  props: UnsubscribeConfirmProps,
): RenderUnsubscribeConfirmResult {
  const body = renderToStaticMarkup(<UnsubscribeConfirmTemplate {...props} />);
  const html = `<!doctype html>${body}`;
  const text = [
    `Baja confirmada para ${props.subscriberEmail}.`,
    '',
    `Volver a suscribirme: ${props.resubscribeUrl}`,
    '',
    'LFPDPPP + CAN-SPAM compliant.',
  ].join('\n');
  return {
    html,
    text,
    subject: 'Baja confirmada — DesarrollosMX',
  };
}
