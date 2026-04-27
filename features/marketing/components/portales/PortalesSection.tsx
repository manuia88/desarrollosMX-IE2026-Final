'use client';

import { useTranslations } from 'next-intl';
import { PORTAL_NAMES, PORTAL_REAL_H1 } from '@/features/marketing/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export function PortalesSection() {
  const t = useTranslations('Marketing');
  const configs = trpc.marketing.portals.list.useQuery({ limit: 20 });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">{t('portales.heading')}</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PORTAL_NAMES.map((p) => {
          const isReal = (PORTAL_REAL_H1 as readonly string[]).includes(p);
          const cfg = (configs.data ?? []).find((c) => c.portal === p);
          return (
            <Card key={p} className="flex items-center justify-between gap-3 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[var(--canon-white-pure)]">
                  {t(`portales.names.${p}`)}
                </span>
                <span className="text-xs text-[color:rgba(255,255,255,0.65)]">
                  {cfg?.is_active
                    ? t('portales.statusActive')
                    : isReal
                      ? t('portales.statusNotConfigured')
                      : t('portales.statusComingF14C1')}
                </span>
              </div>
              <DisclosurePill tone={isReal ? 'indigo' : 'violet'}>
                {isReal ? t('portales.tagH1') : t('portales.tagH2')}
              </DisclosurePill>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
