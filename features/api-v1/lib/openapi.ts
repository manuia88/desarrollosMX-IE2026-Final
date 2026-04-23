// OpenAPI 3.1 spec generator for DesarrollosMX Public REST API v1.
// Hand-maintained shape (Postman-compatible). Documents endpoints from
// BLOQUE 11.L.4 + 11.L.2 + 11.L.7. Avoids generating from Zod at runtime to
// keep the response deterministic and review-friendly.

import { API_TIERS, TIER_DAILY_QUOTA } from '../types';

export interface OpenApiSpec {
  readonly openapi: '3.1.0';
  readonly info: Readonly<{ title: string; version: string; description: string }>;
  readonly servers: ReadonlyArray<{ url: string; description: string }>;
  readonly security: ReadonlyArray<Record<string, readonly string[]>>;
  readonly paths: Readonly<Record<string, unknown>>;
  readonly components: Readonly<{
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  }>;
  readonly tags: ReadonlyArray<{ name: string; description: string }>;
}

const API_VERSION = '1.0.0';

const TIER_SCHEMA = Object.freeze({
  type: 'string',
  enum: [...API_TIERS],
});

const ERROR_SCHEMA = Object.freeze({
  type: 'object',
  required: ['ok', 'error'],
  properties: {
    ok: { const: false },
    error: { type: 'string' },
    message: { type: 'string' },
    tier: TIER_SCHEMA,
    reset_at: { type: 'string', format: 'date-time' },
  },
});

const RATE_LIMIT_SCHEMA = Object.freeze({
  type: 'object',
  required: ['remaining', 'reset_at'],
  properties: {
    remaining: { type: 'integer' },
    reset_at: { type: 'string', format: 'date-time' },
  },
});

function successSchema(dataRef: string): Record<string, unknown> {
  return {
    type: 'object',
    required: ['ok', 'data', 'tier', 'rate_limit'],
    properties: {
      ok: { const: true },
      data: { $ref: dataRef },
      tier: TIER_SCHEMA,
      rate_limit: { $ref: '#/components/schemas/RateLimit' },
    },
  };
}

const COMMON_RESPONSES = Object.freeze({
  '400': {
    description: 'Invalid payload',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
  },
  '401': {
    description: 'Invalid or missing API key',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
  },
  '404': {
    description: 'Not found',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
  },
  '429': {
    description: 'Rate limit exceeded',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
  },
  '500': {
    description: 'Internal error',
    content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
  },
});

export function buildOpenApiSpec(): OpenApiSpec {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DesarrollosMX Public REST API',
      version: API_VERSION,
      description: [
        'Public REST API for DesarrollosMX indices, colonias, pulse scores and time machine.',
        '',
        'Authentication via `x-dmx-api-key` header (or `Authorization: Bearer`).',
        `Daily quotas: ${API_TIERS.map((t) => `${t}=${TIER_DAILY_QUOTA[t]}`).join(', ')}.`,
        'Enterprise tier (-1) is unlimited.',
      ].join('\n'),
    },
    servers: [
      { url: 'https://desarrollosmx.com/api/v1', description: 'Production' },
      { url: 'https://{host}/api/v1', description: 'Preview / Staging' },
    ],
    security: [{ ApiKeyAuth: [] }],
    tags: [
      { name: 'scores', description: 'Time machine (historical indices)' },
      { name: 'indices', description: 'Index rankings and detail' },
      { name: 'colonias', description: 'Colonia profile + similar' },
      { name: 'keys', description: 'API key management (session-auth)' },
    ],
    paths: {
      '/scores/history': {
        get: {
          tags: ['scores'],
          operationId: 'getScoresHistory',
          summary: 'Time machine: historical index values for a scope',
          parameters: [
            {
              name: 'scope',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/ScopeType' },
            },
            { name: 'id', in: 'query', required: true, schema: { type: 'string' } },
            {
              name: 'indexCode',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/IndexCode' },
            },
            {
              name: 'from',
              in: 'query',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            },
            {
              name: 'to',
              in: 'query',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
            },
            { name: 'cursor', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Paginated history items',
              content: {
                'application/json': { schema: successSchema('#/components/schemas/HistoryData') },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/indices/{code}': {
        get: {
          tags: ['indices'],
          operationId: 'getIndexRanking',
          summary: 'Ranking list for an index code',
          parameters: [
            {
              name: 'code',
              in: 'path',
              required: true,
              schema: { $ref: '#/components/schemas/IndexCode' },
            },
            {
              name: 'scope',
              in: 'query',
              required: false,
              schema: { $ref: '#/components/schemas/ScopeType' },
            },
            { name: 'country', in: 'query', required: false, schema: { type: 'string' } },
            {
              name: 'period',
              in: 'query',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            },
            {
              name: 'order',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['asc', 'desc'] },
            },
          ],
          responses: {
            '200': {
              description: 'Ranking list',
              content: {
                'application/json': {
                  schema: successSchema('#/components/schemas/IndicesRankingData'),
                },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/indices/{code}/{scope}/{id}': {
        get: {
          tags: ['indices'],
          operationId: 'getIndexDetail',
          summary: 'Single value detail for scope+index+period',
          parameters: [
            {
              name: 'code',
              in: 'path',
              required: true,
              schema: { $ref: '#/components/schemas/IndexCode' },
            },
            {
              name: 'scope',
              in: 'path',
              required: true,
              schema: { $ref: '#/components/schemas/ScopeType' },
            },
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            {
              name: 'period',
              in: 'query',
              required: false,
              schema: { type: 'string', pattern: '^\\d{4}-\\d{2}$' },
            },
          ],
          responses: {
            '200': {
              description: 'Index detail',
              content: {
                'application/json': {
                  schema: successSchema('#/components/schemas/IndicesDetailData'),
                },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/colonias/{id}': {
        get: {
          tags: ['colonias'],
          operationId: 'getColoniaProfile',
          summary: 'Full colonia profile — all 15 DMX indices + pulse score',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': {
              description: 'Colonia profile',
              content: {
                'application/json': {
                  schema: successSchema('#/components/schemas/ColoniaProfileData'),
                },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/similar/{coloniaId}': {
        get: {
          tags: ['colonias'],
          operationId: 'getSimilarColonias',
          summary: 'Top-5 nearest colonias by DNA vector cosine similarity',
          parameters: [
            { name: 'coloniaId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Nearest colonias',
              content: {
                'application/json': {
                  schema: successSchema('#/components/schemas/SimilarColoniaData'),
                },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/keys/create': {
        post: {
          tags: ['keys'],
          operationId: 'createApiKey',
          summary: 'Issue a new API key for the authenticated user',
          security: [{ SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', minLength: 1, maxLength: 120 },
                    scopes: { type: 'array', items: { type: 'string' } },
                    expires_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Key created — raw_key returned ONCE',
              content: {
                'application/json': { schema: successSchema('#/components/schemas/CreateKeyData') },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/keys/list': {
        get: {
          tags: ['keys'],
          operationId: 'listApiKeys',
          summary: 'List API keys owned by authenticated user',
          security: [{ SessionAuth: [] }],
          responses: {
            '200': {
              description: 'Keys list',
              content: {
                'application/json': { schema: successSchema('#/components/schemas/ListKeysData') },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
      '/keys/revoke': {
        post: {
          tags: ['keys'],
          operationId: 'revokeApiKey',
          summary: 'Revoke an API key owned by authenticated user',
          security: [{ SessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['api_key_id'],
                  properties: {
                    api_key_id: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Key revoked',
              content: {
                'application/json': { schema: successSchema('#/components/schemas/RevokeKeyData') },
              },
            },
            ...COMMON_RESPONSES,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-dmx-api-key' },
        SessionAuth: { type: 'apiKey', in: 'cookie', name: 'sb-access-token' },
      },
      schemas: {
        ApiError: ERROR_SCHEMA,
        RateLimit: RATE_LIMIT_SCHEMA,
        Tier: TIER_SCHEMA,
        ScopeType: { type: 'string', enum: ['colonia', 'alcaldia', 'city', 'estado'] },
        IndexCode: {
          type: 'string',
          enum: [
            'IPV',
            'IAB',
            'IDS',
            'IRE',
            'ICO',
            'MOM',
            'LIV',
            'FAM',
            'YNG',
            'GRN',
            'STR',
            'INV',
            'DEV',
            'GNT',
            'STA',
          ],
        },
        HistoryItem: {
          type: 'object',
          required: ['id', 'period_date', 'value', 'confidence'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            period_date: { type: 'string' },
            period_type: { type: 'string' },
            value: { type: 'number' },
            confidence: { type: 'string' },
            confidence_score: { type: 'number', nullable: true },
            percentile: { type: 'number', nullable: true },
            ranking_in_scope: { type: 'integer', nullable: true },
            score_band: { type: 'string', nullable: true },
            trend_direction: { type: 'string', nullable: true },
            trend_vs_previous: { type: 'number', nullable: true },
            methodology_version: { type: 'string' },
          },
        },
        HistoryData: {
          type: 'object',
          required: ['items', 'next_cursor', 'scope', 'scope_id', 'index_code'],
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/HistoryItem' } },
            next_cursor: { type: 'string', nullable: true },
            scope: { $ref: '#/components/schemas/ScopeType' },
            scope_id: { type: 'string' },
            index_code: { $ref: '#/components/schemas/IndexCode' },
          },
        },
        IndicesRankingItem: {
          type: 'object',
          properties: {
            scope_id: { type: 'string' },
            scope_type: { type: 'string' },
            index_code: { type: 'string' },
            period_date: { type: 'string' },
            value: { type: 'number' },
            ranking_in_scope: { type: 'integer', nullable: true },
            percentile: { type: 'number', nullable: true },
            score_band: { type: 'string', nullable: true },
            confidence: { type: 'string' },
            trend_direction: { type: 'string', nullable: true },
          },
        },
        IndicesRankingData: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/IndicesRankingItem' } },
            period: { type: 'string' },
            index_code: { $ref: '#/components/schemas/IndexCode' },
            scope: { $ref: '#/components/schemas/ScopeType' },
            country: { type: 'string' },
            total: { type: 'integer' },
          },
        },
        IndicesDetailData: {
          type: 'object',
          properties: {
            index_code: { $ref: '#/components/schemas/IndexCode' },
            scope_type: { $ref: '#/components/schemas/ScopeType' },
            scope_id: { type: 'string' },
            period_date: { type: 'string' },
            value: { type: 'number' },
            ranking_in_scope: { type: 'integer', nullable: true },
            percentile: { type: 'number', nullable: true },
            score_band: { type: 'string', nullable: true },
            confidence: { type: 'string' },
            confidence_score: { type: 'number', nullable: true },
            trend_direction: { type: 'string', nullable: true },
            trend_vs_previous: { type: 'number', nullable: true },
            methodology_version: { type: 'string' },
          },
        },
        ColoniaProfileData: {
          type: 'object',
          properties: {
            colonia_id: { type: 'string' },
            country_code: { type: 'string' },
            indices: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index_code: { type: 'string' },
                  value: { type: 'number' },
                  period_date: { type: 'string' },
                  confidence: { type: 'string' },
                  percentile: { type: 'number', nullable: true },
                  trend_direction: { type: 'string', nullable: true },
                  score_band: { type: 'string', nullable: true },
                },
              },
            },
            pulse_score: { type: 'number', nullable: true },
            pulse_period: { type: 'string', nullable: true },
            latest_period: { type: 'string', nullable: true },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: { type: 'string' },
                  accessed_at: { type: 'string' },
                },
              },
            },
          },
        },
        SimilarColoniaData: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  colonia_id: { type: 'string' },
                  similarity: { type: 'number' },
                },
              },
            },
            source_colonia_id: { type: 'string' },
            note: { type: 'string' },
          },
        },
        CreateKeyData: {
          type: 'object',
          properties: {
            api_key_id: { type: 'string', format: 'uuid' },
            raw_key: { type: 'string' },
            name: { type: 'string' },
            scopes: { type: 'array', items: { type: 'string' } },
            expires_at: { type: 'string', nullable: true },
          },
        },
        ListKeysData: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  key_prefix: { type: 'string' },
                  scopes: { type: 'array', items: { type: 'string' } },
                  created_at: { type: 'string' },
                  last_used_at: { type: 'string', nullable: true },
                  expires_at: { type: 'string', nullable: true },
                  revoked_at: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        RevokeKeyData: {
          type: 'object',
          properties: {
            api_key_id: { type: 'string', format: 'uuid' },
            revoked_at: { type: 'string' },
          },
        },
      },
    },
  };
}
