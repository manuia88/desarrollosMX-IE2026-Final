import { NextResponse } from 'next/server';

type CspReport = {
  'csp-report'?: Record<string, unknown>;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (!raw) {
      return new NextResponse(null, { status: 204 });
    }

    let parsed: CspReport | null = null;
    try {
      parsed = JSON.parse(raw) as CspReport;
    } catch {
      parsed = { raw };
    }

    const report = parsed['csp-report'] ?? parsed;

    // Sentry + PostHog stub: activable por env cuando FASE 24 los encienda.
    if (process.env.SENTRY_ENABLED === 'true') {
      // Placeholder: integración real en FASE 24.
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn('[csp-report]', JSON.stringify(report).slice(0, 2048));
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[csp-report] parse error', error);
    return new NextResponse(null, { status: 204 });
  }
}
