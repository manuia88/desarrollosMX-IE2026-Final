import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { WidgetPulseCompare } from '@/features/widget-embed/components/WidgetPulseCompare';
import { getEmbedMessages, resolveEmbedLocale } from '@/features/widget-embed/lib/load-messages';
import { trackEmbedView } from '@/features/widget-embed/lib/tracking';
import {
  widgetCustomizationSchema,
  widgetScopeIdSchema,
} from '@/features/widget-embed/schemas/embed';

interface PageProps {
  readonly params: Promise<{ coloniaA: string; coloniaB: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resolveTheme(raw: string | undefined): 'light' | 'dark' | 'auto' {
  if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
  return 'auto';
}

export default async function EmbedPulseComparePage({ params, searchParams }: PageProps) {
  const { coloniaA, coloniaB } = await params;
  const sp = await searchParams;

  const parsedA = widgetScopeIdSchema.safeParse(coloniaA);
  const parsedB = widgetScopeIdSchema.safeParse(coloniaB);
  if (!parsedA.success || !parsedB.success) {
    notFound();
  }

  const themeRaw = firstParam(sp.theme);
  const localeRaw = firstParam(sp.locale);
  const embedIdRaw = firstParam(sp.embed_id);

  const locale = resolveEmbedLocale(localeRaw);
  const theme = resolveTheme(themeRaw);

  const parsedCustom = widgetCustomizationSchema.safeParse({ theme, locale });
  const customization = parsedCustom.success ? parsedCustom.data : { theme, locale };

  const messages = getEmbedMessages(locale);

  await trackEmbedView({
    scopeType: 'colonia',
    scopeId: parsedA.data,
    ...(embedIdRaw !== undefined ? { embedId: embedIdRaw } : {}),
  });

  const ctaUrl = `https://desarrollosmx.com/${locale}/indices?scope=colonia&scope_id=${encodeURIComponent(
    parsedA.data,
  )}&compare=${encodeURIComponent(parsedB.data)}`;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          padding: 'var(--space-2, 0.5rem)',
        }}
      >
        <WidgetPulseCompare
          scopeType="colonia"
          scopeIdA={parsedA.data}
          scopeIdB={parsedB.data}
          customization={customization}
          ctaUrl={ctaUrl}
        />
      </main>
    </NextIntlClientProvider>
  );
}
