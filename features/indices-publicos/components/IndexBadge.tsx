import { useTranslations } from 'next-intl';
import { LabelPill } from '@/shared/ui/dopamine/label-pill';
import { cn } from '@/shared/ui/primitives/cn';
import { INDEX_REGISTRY, type IndexCode } from '../lib/index-registry-helpers';

export interface IndexBadgeProps {
  readonly code: IndexCode;
  readonly size?: 'sm' | 'md' | 'lg';
  readonly showName?: boolean;
  readonly className?: string;
}

export function IndexBadge({ code, size = 'md', showName = false, className }: IndexBadgeProps) {
  const t = useTranslations('IndicesPublic');
  const definition = INDEX_REGISTRY[code];
  const name = t(`indices.${code}.short`);
  const full = t(`indices.${code}.name`);

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LabelPill tone={definition.tone} size={size} aria-label={full}>
        {code}
      </LabelPill>
      {showName ? (
        <span
          className="text-[color:var(--color-text-secondary)]"
          style={{ fontSize: 'var(--text-sm)' }}
        >
          {name}
        </span>
      ) : null}
    </span>
  );
}
