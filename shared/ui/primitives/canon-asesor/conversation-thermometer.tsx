import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/shared/ui/primitives/canon/cn';

export type ConversationTemperature = 1 | 2 | 3 | 4 | 5;

export interface ConversationThermometerProps extends HTMLAttributes<HTMLDivElement> {
  temperature: ConversationTemperature;
  label?: string;
  showLegend?: boolean;
  legendLabels?: readonly [string, string, string];
}

const SEGMENTS: { token: string }[] = [
  { token: 'var(--temp-cold)' },
  { token: 'var(--temp-cool)' },
  { token: 'var(--temp-warm)' },
  { token: 'var(--temp-hot)' },
  { token: 'var(--temp-burning)' },
];

export const ConversationThermometer = forwardRef<HTMLDivElement, ConversationThermometerProps>(
  function ConversationThermometer(
    {
      temperature,
      label,
      showLegend = false,
      legendLabels = ['Frío', 'Tibio', 'Caliente'],
      className,
      style,
      ...rest
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        data-canon-variant="conversation-thermometer"
        data-temperature={temperature}
        className={cn('canon-conversation-thermometer', className)}
        style={style}
        {...rest}
      >
        {label ? (
          <div
            className="mb-1.5 text-[10.5px] uppercase tracking-wide"
            style={{
              color: 'var(--canon-cream-2)',
              fontFamily: 'var(--font-body)',
              letterSpacing: '0.06em',
            }}
          >
            {label}
          </div>
        ) : null}
        {/* biome-ignore lint/a11y/useSemanticElements: meter role on div is canonical when no native equivalent exposes the segmented visual */}
        <div
          role="meter"
          aria-label={label ?? `Temperatura ${temperature} de 5`}
          aria-valuenow={temperature}
          aria-valuemin={1}
          aria-valuemax={5}
          style={{
            display: 'flex',
            gap: 3,
            height: 8,
          }}
        >
          {SEGMENTS.map((segment, i) => {
            const idx = i + 1;
            const isLit = idx <= temperature;
            const isActive = idx === temperature;
            const segStyle: CSSProperties = {
              flex: 1,
              background: segment.token,
              opacity: isLit ? 1 : 0.18,
              borderRadius: 'var(--canon-radius-sharp)',
              transition:
                'opacity 300ms var(--canon-ease-out), box-shadow 300ms var(--canon-ease-out)',
              boxShadow: isActive ? `0 0 12px ${segment.token}` : 'none',
            };
            // biome-ignore lint/suspicious/noArrayIndexKey: 5 fixed segments, order is stable
            return <div key={i} style={segStyle} aria-hidden="true" />;
          })}
        </div>
        {showLegend ? (
          <div
            className="mt-1 flex justify-between"
            style={{
              fontSize: 10,
              color: 'var(--canon-cream-3)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span>{legendLabels[0]}</span>
            <span>{legendLabels[1]}</span>
            <span>{legendLabels[2]}</span>
          </div>
        ) : null}
      </div>
    );
  },
);
