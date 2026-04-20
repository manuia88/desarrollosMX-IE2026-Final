// STUB FASE 21 — portal público UI completa de /estimate.
// Ref: FASE_08 §BLOQUE 8.D.4 + ADR-018 E2E Connectedness (4 señales stub).
//
// Señales:
//   1. Comentario "STUB FASE 21" marca la no-implementación explícita.
//   2. Badge visual [próximamente] renderizado abajo.
//   3. Link a documentación API (endpoint real activo: POST /api/v1/estimate).
//   4. §5.B reporte: stub documentado al cierre BLOQUE 8.D.
//
// La UI completa (formulario propiedad + consumo endpoint + visualización
// confidence badges D4 + adjustments D5 + counter-estimate D6) llega en
// FASE 21 portal público. El endpoint /api/v1/estimate está activo y
// consumible desde cualquier cliente autenticado o con BotID pasado.

import { AVM_TIERS } from '@/shared/lib/intelligence-engine/avm/pricing-tiers';

export const metadata = {
  title: 'DMX Estimate — AVM MVP',
  description: 'Valuación automática 47-variable. Endpoint disponible; UI en FASE 21.',
};

export default function EstimatePage() {
  return (
    <main style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <header>
        <h1>DMX Estimate</h1>
        <p>
          <span
            role="status"
            aria-label="próximamente"
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              border: '1px solid currentColor',
              borderRadius: 4,
              fontSize: 12,
              letterSpacing: 0.5,
            }}
          >
            UI próximamente — FASE 21
          </span>
        </p>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <p>
          El endpoint <code>POST /api/v1/estimate</code> ya está activo. La interfaz visual
          (formulario + visualización de intervalos de confianza + adjustments auditables) llega en
          FASE 21.
        </p>
        <p>
          Mientras tanto, desarrolladores y partners B2B pueden consumir el endpoint directamente.
          Ver <a href="#docs-api">documentación API</a>.
        </p>
      </section>

      <section id="pricing" style={{ marginTop: '2rem' }}>
        <h2>Pricing tiers</h2>
        <ul>
          <li>
            <strong>Free</strong>: {AVM_TIERS.free.quota} estimates/mes por IP.
          </li>
          <li>
            <strong>Pro</strong>: ilimitado (requiere API key Pro).
          </li>
          <li>
            <strong>Enterprise</strong>: ilimitado + SLA + soporte dedicado.
          </li>
        </ul>
      </section>

      <section id="docs-api" style={{ marginTop: '2rem' }}>
        <h2>API</h2>
        <pre style={{ fontSize: 12, overflowX: 'auto' }}>
          {`curl -X POST https://<dmx-domain>/api/v1/estimate \\
  -H 'content-type: application/json' \\
  -d '{"lat":19.3854,"lng":-99.1683,"sup_m2":120,
       "recamaras":3,"banos":2,"amenidades":["alberca"],
       "estado_conservacion":"excelente","tipo_propiedad":"depto"}'`}
        </pre>
      </section>
    </main>
  );
}
