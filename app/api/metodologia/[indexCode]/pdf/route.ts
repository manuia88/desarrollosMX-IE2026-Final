// NOTA Next.js 16 cacheComponents: NO export const dynamic/runtime aquí
// (rompe build con cacheComponents:true). El endpoint devuelve PDF binario
// generado con @react-pdf/renderer a partir de dmx_indices_methodology_versions.

import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { isIndexCode } from '@/features/indices-publicos/lib/index-registry-helpers';
import type { MethodologyRow } from '@/features/indices-publicos/lib/methodology-helpers';
import { renderMethodologyPDF } from '@/features/indices-publicos/lib/pdf-generator';
import { createClient } from '@/shared/lib/supabase/server';
import type { IndexCode } from '@/shared/types/scores';

export const maxDuration = 60;

interface RouteParams {
  readonly params: Promise<{ readonly indexCode: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { indexCode } = await params;
  if (!isIndexCode(indexCode)) {
    return NextResponse.json({ error: 'invalid_index_code' }, { status: 404 });
  }
  const code: IndexCode = indexCode;

  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale') ?? 'es-MX';
  const supportedLocales = ['es-MX', 'es-CO', 'es-AR', 'pt-BR', 'en-US'] as const;
  const locale = (supportedLocales as readonly string[]).includes(localeParam)
    ? localeParam
    : 'es-MX';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dmx_indices_methodology_versions')
    .select(
      'index_code,version,formula_md,weights_jsonb,effective_from,effective_to,changelog_notes,approved_at',
    )
    .eq('index_code', code)
    .order('effective_from', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'methodology_fetch_error' }, { status: 500 });
  }

  const versions = (data ?? []) as ReadonlyArray<MethodologyRow>;
  if (versions.length === 0) {
    return NextResponse.json({ error: 'no_methodology' }, { status: 404 });
  }

  const t = await getTranslations({ locale, namespace: 'IndicesPublic.methodology' });
  const today = new Date().toISOString().slice(0, 10);

  const pdfBuffer = await renderMethodologyPDF({
    indexCode: code,
    versions,
    today,
    strings: {
      coverTitle: t('detail_title', { code }),
      coverSubtitle: t('pdf_cover_subtitle'),
      versionLabel: t('version_label', { version: '{version}' }),
      effectiveFrom: t('effective_from', { date: '{date}' }),
      effectiveTo: t('effective_to', { date: '{date}' }),
      weightsTitle: t('weights_title'),
      formulaTitle: t('formula_title'),
      changelogTitle: t('changelog_title'),
      generatedAt: t('pdf_generated_at', { date: today }),
      footerDisclaimer: t('pdf_footer_disclaimer'),
    },
  });

  if (!pdfBuffer) {
    return NextResponse.json({ error: 'pdf_render_failed' }, { status: 500 });
  }

  const body = new Uint8Array(pdfBuffer);
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="dmx-metodologia-${code}.pdf"`,
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
