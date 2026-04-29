import { NextResponse } from 'next/server';

export const maxDuration = 10;

const SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'DMX Developer Enterprise API',
    version: '1.0.0',
    description:
      '15.X.5 — Acceso REST para desarrolladoras Enterprise. Auth: Bearer dmxe_<token>. Rate limit: 100K requests/día por API key. Crear keys en /desarrolladores/moonshots/api-keys.',
  },
  servers: [{ url: 'https://app.desarrollosmx.com/api/v1/developer' }],
  components: {
    securitySchemes: {
      bearerApiKey: { type: 'http', scheme: 'bearer', bearerFormat: 'dmxe_<token>' },
    },
    schemas: {
      ZoneScores: {
        type: 'object',
        properties: {
          zone_id: { type: 'string' },
          country_code: { type: 'string' },
          indices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                value: { type: 'number' },
                confidence: { type: 'string' },
                band: { type: 'string', nullable: true },
                percentile: { type: 'integer', nullable: true },
                period_date: { type: 'string', format: 'date' },
                methodology_version: { type: 'string' },
              },
            },
          },
          count: { type: 'integer' },
          generated_at: { type: 'string', format: 'date-time' },
        },
      },
      PipelineSnapshot: {
        type: 'object',
        properties: {
          proyectoId: { type: 'string' },
          proyectoNombre: { type: 'string' },
          zoneId: { type: 'string', nullable: true },
          status: { type: 'string', nullable: true },
          avanceObraPct: { type: 'number', nullable: true },
          absorcionActual: { type: 'number', nullable: true },
          absorcionBenchmark: { type: 'number', nullable: true },
          absorcionDeltaPct: { type: 'number', nullable: true },
          precioM2Mxn: { type: 'number', nullable: true },
          precioM2ZoneMedian: { type: 'number', nullable: true },
          precioDeltaPct: { type: 'number', nullable: true },
          dmxScore: { type: 'number', nullable: true },
          trustScore: { type: 'number', nullable: true },
          alerts: { type: 'array', items: { type: 'object' } },
          snapshotDate: { type: 'string', format: 'date' },
        },
      },
      SimulateRequest: {
        type: 'object',
        required: ['ubicacion', 'tipologia', 'pricing'],
        properties: {
          ubicacion: {
            type: 'object',
            properties: {
              zoneId: { type: 'string', nullable: true },
              ciudad: { type: 'string' },
              colonia: { type: 'string' },
              countryCode: { type: 'string', default: 'MX' },
            },
          },
          tipologia: {
            type: 'object',
            properties: {
              tipo: { type: 'string', enum: ['vertical', 'horizontal', 'mixto'] },
              unidades: { type: 'integer' },
              m2Promedio: { type: 'number' },
              amenidades: { type: 'array', items: { type: 'string' } },
            },
          },
          pricing: {
            type: 'object',
            properties: {
              precioM2Mxn: { type: 'number' },
              paymentSplit: { type: 'object' },
              costoConstruccionM2Mxn: { type: 'number' },
              costoTerrenoMxn: { type: 'number' },
              gastosFijosMxn: { type: 'number' },
            },
          },
        },
      },
      SimulateResponse: {
        type: 'object',
        properties: {
          runId: { type: 'string' },
          outputs: {
            type: 'object',
            properties: {
              absorcionMeses: { type: 'number', nullable: true },
              revenueMxn: { type: 'integer' },
              costMxn: { type: 'integer' },
              irr: { type: 'number', nullable: true },
              npvMxn: { type: 'integer' },
              breakEvenMonth: { type: 'integer', nullable: true },
              pmfScore: { type: 'integer' },
              sensitivity: { type: 'object' },
              riskFlags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      AlertsList: {
        type: 'object',
        properties: {
          alerts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                zoneId: { type: 'string' },
                alphaScore: { type: 'number' },
                detectedAt: { type: 'string', format: 'date-time' },
                signals: { type: 'object' },
                timeToMainstreamMonths: { type: 'integer', nullable: true },
              },
            },
          },
          count: { type: 'integer' },
        },
      },
    },
  },
  security: [{ bearerApiKey: [] }],
  paths: {
    '/scores/{zone_id}': {
      get: {
        summary: '15 índices DMX por zona',
        parameters: [
          {
            name: 'zone_id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'country',
            in: 'query',
            schema: { type: 'string', default: 'MX' },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ZoneScores' } },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Scope scores:read required' },
          '429': { description: 'Rate limit exceeded' },
        },
        'x-required-scope': 'scores:read',
      },
    },
    '/pipeline': {
      get: {
        summary: 'Pipeline tracker (snapshots últimos N días)',
        parameters: [
          {
            name: 'range_days',
            in: 'query',
            schema: { type: 'integer', default: 30, minimum: 7, maximum: 365 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    desarrolladora_id: { type: 'string' },
                    range_from_days: { type: 'integer' },
                    snapshots: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PipelineSnapshot' },
                    },
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        'x-required-scope': 'pipeline:read',
      },
    },
    '/simulate': {
      post: {
        summary: 'Simulador de proyecto (B04 + B08 + B09)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/SimulateRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SimulateResponse' } },
            },
          },
          '400': { description: 'Validation error' },
        },
        'x-required-scope': 'simulate:write',
      },
    },
    '/alerts': {
      get: {
        summary: 'Alpha alerts feed (zonas suscritas)',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AlertsList' } },
            },
          },
        },
        'x-required-scope': 'alerts:read',
      },
    },
  },
} as const;

export async function GET(): Promise<Response> {
  return NextResponse.json(SPEC, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
