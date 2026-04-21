// FASE 11.J — Double opt-in confirmation email (día 0 de onboarding).

import type { ReactElement } from 'react';
import { renderToStaticMarkupSafe as renderToStaticMarkup } from '../lib/render-email';
import type { NewsletterLocale } from '../types';

export interface ConfirmEmailProps {
  readonly locale: NewsletterLocale;
  readonly confirmUrl: string;
  readonly subscriberEmail: string;
}

export function ConfirmEmailTemplate(props: ConfirmEmailProps): ReactElement {
  return (
    <html lang={props.locale}>
      {/* biome-ignore lint/style/noHeadElement: HTML email template, not Next.js page */}
      <head>
        <meta charSet="utf-8" />
        <title>Confirma tu suscripción — DesarrollosMX</title>
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
                <h1 style={{ fontSize: 22, margin: '0 0 16px' }}>¡Confirma tu suscripción!</h1>
                <p style={{ margin: '0 0 16px', lineHeight: 1.5 }}>
                  Recibimos una solicitud para suscribir <strong>{props.subscriberEmail}</strong> al
                  newsletter mensual de DesarrollosMX.
                </p>
                <p style={{ margin: '0 0 24px', lineHeight: 1.5 }}>
                  Haz clic en el siguiente botón para confirmar:
                </p>
                <p style={{ textAlign: 'center', margin: '0 0 24px' }}>
                  <a
                    href={props.confirmUrl}
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
                    Confirmar suscripción
                  </a>
                </p>
                <p style={{ margin: 0, fontSize: 12, color: '#777', lineHeight: 1.5 }}>
                  Si no solicitaste esta suscripción, ignora este correo — no haremos nada.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export interface RenderConfirmEmailResult {
  readonly html: string;
  readonly text: string;
  readonly subject: string;
}

export function renderConfirmEmail(props: ConfirmEmailProps): RenderConfirmEmailResult {
  const body = renderToStaticMarkup(<ConfirmEmailTemplate {...props} />);
  const html = `<!doctype html>${body}`;
  const text = [
    'Confirma tu suscripción al newsletter mensual DesarrollosMX.',
    '',
    `Email: ${props.subscriberEmail}`,
    '',
    `Confirma aquí: ${props.confirmUrl}`,
    '',
    'Si no solicitaste esta suscripción, ignora este correo.',
  ].join('\n');
  return {
    html,
    text,
    subject: 'Confirma tu suscripción — DesarrollosMX',
  };
}
