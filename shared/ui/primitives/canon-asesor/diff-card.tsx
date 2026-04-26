import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export interface DiffCardProps extends HTMLAttributes<HTMLDivElement> {
  before: ReactNode;
  after: ReactNode;
  label?: string;
  deltaLabel?: string;
}

export const DiffCard = forwardRef<HTMLDivElement, DiffCardProps>(function DiffCard(
  { before, after, label, deltaLabel, className, style, ...rest },
  ref,
) {
  const cardStyle: CSSProperties = {
    padding: 12,
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-border)',
    borderRadius: 'var(--canon-radius-inner)',
    color: 'var(--canon-cream)',
    ...style,
  };

  return (
    <div
      ref={ref}
      data-canon-variant="diff-card"
      className={cn('canon-diff-card', className)}
      style={cardStyle}
      {...rest}
    >
      {label ? (
        <div
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--canon-cream-2)',
            marginBottom: 6,
            fontFamily: 'var(--font-body)',
          }}
        >
          {label}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          data-diff-role="before"
          style={{
            textDecoration: 'line-through',
            opacity: 0.6,
            color: 'var(--canon-cream-2)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {before}
        </span>
        <span
          data-diff-role="after"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            color: 'var(--canon-cream)',
            background: 'rgba(99, 102, 241, 0.10)',
            padding: '4px 10px',
            borderRadius: 'var(--canon-radius-sharp)',
            alignSelf: 'flex-start',
            fontFamily: 'var(--font-display)',
            animation: 'diff-after-in 200ms var(--canon-ease-out) backwards',
          }}
        >
          {after}
          {deltaLabel ? (
            <span
              style={{
                fontSize: 11,
                color: 'var(--canon-indigo-2)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {deltaLabel}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
});
