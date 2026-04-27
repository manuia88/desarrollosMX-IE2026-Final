'use client';

import { useTranslations } from 'next-intl';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

interface PhotoRow {
  id: string;
  url: string | null;
  category: string | null;
  classify_status: string;
}

export function PhotosSection() {
  const t = useTranslations('Marketing');
  const list = trpc.marketing.photos.listByUser.useQuery({ limit: 50 });
  const rows = (list.data ?? []) as unknown as PhotoRow[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">
          {t('photos.heading', { count: rows.length })}
        </h2>
        <DisclosurePill tone="indigo">{t('photos.disclosureClassify')}</DisclosurePill>
      </div>

      {list.isLoading ? (
        <Card className="p-6 text-sm text-[color:rgba(255,255,255,0.65)]">
          {t('common.loading')}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[color:rgba(255,255,255,0.70)]">{t('photos.empty.body')}</p>
          <p className="mt-2 text-xs text-[color:rgba(255,255,255,0.50)]">
            {t('photos.uploadInstructions')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {rows.map((photo) => (
            <Card key={photo.id} className="flex flex-col gap-2 p-3">
              {photo.url ? (
                // biome-ignore lint/performance/noImgElement: Supabase Storage external host; next/image domains config postpuesto a F14.D infra pass
                <img
                  src={photo.url}
                  alt={photo.category ?? 'photo'}
                  className="h-32 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center rounded-lg bg-[color:rgba(255,255,255,0.04)] text-xs text-[color:rgba(255,255,255,0.45)]">
                  {t('photos.noPreview')}
                </div>
              )}
              <span className="rounded-full bg-[color:rgba(99,102,241,0.18)] px-2 py-0.5 text-center text-[11px] font-semibold text-[color:var(--canon-indigo-2)]">
                {photo.category
                  ? t(
                      `photos.categories.${photo.category as 'sala' | 'cocina' | 'recamara' | 'bano' | 'fachada' | 'exterior' | 'plano'}`,
                    )
                  : photo.classify_status}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
