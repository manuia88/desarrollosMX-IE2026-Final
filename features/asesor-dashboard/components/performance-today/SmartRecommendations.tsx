import { useTranslations } from 'next-intl';
import { IconArrowRight, IconSparkles } from '@/shared/ui/icons/canon-icons';
import { Button } from '@/shared/ui/primitives/canon/button';
import { Card } from '@/shared/ui/primitives/canon/card';
import { DisclosurePill } from '@/shared/ui/primitives/canon/disclosure-pill';
import { ConfidenceHalo } from '@/shared/ui/primitives/canon-asesor/confidence-halo';

export interface Recommendation {
  id: string;
  title: string;
  body: string;
  confidence: number;
  ctaLabel: string;
}

export interface SmartRecommendationsProps {
  items: readonly Recommendation[];
}

export function SmartRecommendations({ items }: SmartRecommendationsProps) {
  const t = useTranslations('AsesorDashboard.recommendations');

  return (
    <section aria-label={t('aria')} className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2
          className="text-[14px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
        >
          {t('title')}
        </h2>
        <DisclosurePill tone="violet">{t('disclosure')}</DisclosurePill>
      </header>
      {items.length === 0 ? (
        <Card variant="elevated" className="p-6">
          <p
            className="text-[13px]"
            style={{ color: 'var(--canon-cream-3)', fontFamily: 'var(--font-body)' }}
          >
            {t('empty')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {items.map((rec) => (
            <ConfidenceHalo key={rec.id} confidence={rec.confidence} intensity="subtle">
              <Card
                variant="elevated"
                className="flex h-full flex-col gap-3 p-5"
                style={{ borderColor: 'rgba(168, 85, 247, 0.30)' }}
              >
                <div className="flex items-center gap-2">
                  <IconSparkles size={16} className="text-[var(--accent-violet)]" />
                  <h3
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
                  >
                    {rec.title}
                  </h3>
                </div>
                <p
                  className="flex-1 text-[12.5px] leading-relaxed"
                  style={{ color: 'var(--canon-cream-2)', fontFamily: 'var(--font-body)' }}
                >
                  {rec.body}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled
                  aria-label={t('ctaPending')}
                >
                  {rec.ctaLabel} <IconArrowRight size={14} />
                </Button>
              </Card>
            </ConfidenceHalo>
          ))}
        </div>
      )}
    </section>
  );
}
