// F14.F.10 Sprint 9 BIBLIA — Reseller Terms legal page (Plan Fotógrafo).
// Markdown canon legal: reventa permitida + IP + cancelación + disclaimer abogado.
// ADR-054 lock canon DMX Studio dentro DMX único entorno.

import type { Metadata } from 'next';

interface PageProps {
  readonly params: Promise<{ locale: string }>;
}

export const metadata: Metadata = {
  title: 'Términos de Reventa — DMX Studio Plan Fotógrafo',
  description:
    'Términos legales canon para fotógrafos del Plan Fotógrafo DMX Studio: reventa permitida, IP, cancelación.',
  robots: { index: false, follow: false },
};

export default async function ResellerTermsPage({ params }: PageProps) {
  await params;

  return (
    <main
      aria-label="Términos de reventa Plan Fotógrafo"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col gap-6 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <header className="flex flex-col gap-2">
        <span
          style={{
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--canon-cream-3)',
          }}
        >
          DMX Studio · Plan Fotógrafo
        </span>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px',
            fontWeight: 800,
            color: 'var(--canon-cream)',
            letterSpacing: '-0.02em',
          }}
        >
          Términos de Reventa Permitida
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--canon-cream-3)' }}>
          Versión canon plantilla — última actualización: 2026-04-27
        </p>
      </header>

      <article
        style={{
          padding: '28px 32px',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--canon-card-border-default)',
          borderRadius: 'var(--canon-radius-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          fontSize: '14.5px',
          lineHeight: 1.7,
          color: 'var(--canon-cream-2)',
        }}
      >
        <Section
          number="1"
          title="Reventa permitida"
          body={
            <p>
              Como fotógrafo suscrito al Plan Fotógrafo de DMX Studio, tienes permiso explícito para
              revender los videos generados con la plataforma a clientes finales (asesores
              inmobiliarios, agencias, propietarios). DMX Studio no cobra comisión sobre tus ventas
              a clientes finales: tú facturas directamente a tu cliente y DMX Studio cobra
              únicamente el plan base mensual de USD $67.
            </p>
          }
        />

        <Section
          number="2"
          title="Pricing y markup"
          body={
            <p>
              Eres responsable de definir tu pricing y markup hacia clientes finales. DMX Studio
              ofrece una calculadora de markup pública en el directorio de fotógrafos como
              herramienta de transparencia, pero el precio final lo fijas tú. DMX Studio no regula,
              audita ni se responsabiliza por la diferencia entre el costo del plan base y lo que tú
              cobres a tu cliente.
            </p>
          }
        />

        <Section
          number="3"
          title="Sin garantía de outcomes"
          body={
            <p>
              DMX Studio no garantiza outcomes (ventas, leads, conversiones) a tus clientes finales.
              La calidad del video depende de los inputs que tú aportes (fotos, propiedad, brief).
              Cualquier reclamo de tu cliente final por resultados comerciales es relación bilateral
              entre tú y tu cliente, sin responsabilidad de DMX Studio.
            </p>
          }
        />

        <Section
          number="4"
          title="Propiedad intelectual"
          body={
            <>
              <p>
                Los videos generados a través del Plan Fotógrafo pertenecen, en orden de prelación:
              </p>
              <ul style={listStyle}>
                <li>Al fotógrafo (tú) como creador del brief y cliente DMX Studio.</li>
                <li>
                  Al cliente final (asesor / agencia) que adquiera el video, según el contrato
                  bilateral que firmen entre ustedes.
                </li>
              </ul>
              <p>
                DMX Studio retiene únicamente el derecho técnico de almacenamiento y procesamiento
                durante la vigencia de tu suscripción. Música, voces y assets generativos siguen las
                licencias de los proveedores subyacentes (ElevenLabs, Kling). Tu logo, brand kit y
                fotografías son y siguen siendo tu propiedad.
              </p>
            </>
          }
        />

        <Section
          number="5"
          title="White-label"
          body={
            <p>
              El upgrade White-label te permite reemplazar el footer "Generado con DMX Studio" con
              tu propio texto. Esto no implica que el video sea producido por ti técnicamente — sólo
              cambia el footer. No estás autorizado a afirmar a clientes finales que el video fue
              producido sin herramientas de IA si te lo preguntan directamente.
            </p>
          }
        />

        <Section
          number="6"
          title="Cancelación y reembolso"
          body={
            <>
              <p>
                Puedes cancelar tu suscripción al Plan Fotógrafo en cualquier momento desde tu
                panel. La cancelación se efectiva al final del ciclo de facturación pagado: no hay
                reembolsos prorrateados por días no usados.
              </p>
              <p>
                Si experimentas un fallo técnico atribuible a DMX Studio que impida generar videos
                por más de 72 horas continuas en un mes, puedes solicitar un crédito proporcional
                contactando soporte. Reembolsos en efectivo se evalúan caso por caso.
              </p>
            </>
          }
        />

        <Section
          number="7"
          title="Modificaciones"
          body={
            <p>
              DMX Studio puede modificar estos términos avisando con 30 días de anticipación vía
              email. Si no aceptas cambios mayores, puedes cancelar la suscripción antes de su
              entrada en vigor sin penalización.
            </p>
          }
        />

        <Section
          number="8"
          title="Jurisdicción"
          body={
            <p>
              Estos términos se rigen por las leyes de México. Cualquier disputa se resolverá ante
              los tribunales competentes de Ciudad de México, salvo cuando legislación aplicable de
              protección al consumidor en tu jurisdicción local determine lo contrario.
            </p>
          }
        />
      </article>

      <aside
        style={{
          padding: '18px 22px',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.32)',
          borderRadius: '14px',
          fontSize: '13px',
          color: 'var(--canon-cream-2)',
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: '#fcd34d', fontWeight: 700 }}>
          Disclaimer canon — revisión legal pendiente:
        </strong>{' '}
        Esta es una plantilla canon redactada como guía operativa. Antes de pre-launch del Plan
        Fotógrafo, founder action: revisar legalmente con abogado para validar cumplimiento con
        legislación mexicana de comercio electrónico, protección al consumidor y propiedad
        intelectual (L-NEW agendado: REVIEW-RESELLER-TERMS-LEGAL-PRE-LAUNCH).
      </aside>
    </main>
  );
}

interface SectionProps {
  readonly number: string;
  readonly title: string;
  readonly body: React.ReactNode;
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: '17px',
  fontWeight: 700,
  color: 'var(--canon-cream)',
  letterSpacing: '-0.005em',
};

const sectionNumberStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '9999px',
  background: 'var(--gradient-ai)',
  color: '#FFFFFF',
  fontSize: '12px',
  fontWeight: 700,
  marginRight: '10px',
};

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  listStyleType: 'disc',
};

function Section({ number, title, body }: SectionProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h2 style={sectionTitleStyle}>
        <span aria-hidden="true" style={sectionNumberStyle}>
          {number}
        </span>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{body}</div>
    </section>
  );
}
