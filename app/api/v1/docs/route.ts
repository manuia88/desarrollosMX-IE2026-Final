// Public REST API v1 — GET /api/v1/docs.
// Returns the OpenAPI 3.1 spec as JSON for Postman / Swagger UI.

import { NextResponse } from 'next/server';
import { buildOpenApiSpec } from '@/features/api-v1/lib/openapi';
import { apiOptions, corsHeaders } from '@/features/api-v1/lib/responses';

export async function OPTIONS(): Promise<Response> {
  return apiOptions();
}

export async function GET(): Promise<Response> {
  const spec = buildOpenApiSpec();
  return NextResponse.json(spec, {
    status: 200,
    headers: {
      ...corsHeaders(),
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
}
