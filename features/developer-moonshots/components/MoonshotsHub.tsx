'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card } from '@/shared/ui/primitives/canon';

const MODULES = [
  {
    href: '/desarrolladores/moonshots/simulador',
    titleKey: 'simulator.title',
    badge: '15.X.1',
  },
  {
    href: '/desarrolladores/moonshots/radar',
    titleKey: 'radar.title',
    badge: '15.X.2',
  },
  {
    href: '/desarrolladores/moonshots/comite',
    titleKey: 'committee.title',
    badge: '15.X.3',
  },
  {
    href: '/desarrolladores/moonshots/pipeline',
    titleKey: 'pipeline.title',
    badge: '15.X.4',
  },
  {
    href: '/desarrolladores/moonshots/api-keys',
    titleKey: 'apiEnterprise.title',
    badge: '15.X.5',
  },
] as const;

export function MoonshotsHub() {
  const t = useTranslations('dev.moonshots');
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((mod) => (
          <Link key={mod.href} href={mod.href} className="block">
            <Card className="flex h-full flex-col justify-between gap-3 p-5 transition hover:translate-y-[-2px]">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider"
                  style={{
                    background: 'rgba(99,102,241,0.18)',
                    color: '#a5b4fc',
                  }}
                >
                  {mod.badge}
                </span>
              </div>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
              >
                {t(mod.titleKey)}
              </h2>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
