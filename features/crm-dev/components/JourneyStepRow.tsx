'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Button } from '@/shared/ui/primitives/canon';
import type { JourneyStep } from '../schemas';

export interface JourneyStepRowProps {
  readonly step: JourneyStep;
  readonly index: number;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onRemove: () => void;
}

export function JourneyStepRow({
  step,
  index,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: JourneyStepRowProps) {
  const t = useTranslations('dev.crm.journey.step');

  const containerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 'var(--canon-radius-card)',
    background: 'var(--canon-bg)',
    border: '1px solid var(--canon-border)',
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    margin: 0,
  };

  const subStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    color: 'var(--canon-cream-2)',
    margin: '2px 0 0',
  };

  const description = describeStep(step);

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 'var(--canon-radius-pill)',
            background: 'var(--canon-indigo-3-faint, rgba(99,102,241,0.2))',
            color: 'var(--canon-indigo-2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {index + 1}
        </span>
        <div style={{ minWidth: 0 }}>
          <p style={titleStyle}>{t(`type.${step.type}`)}</p>
          <p style={subStyle}>{description}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          aria-label={t('moveUp')}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          aria-label={t('moveDown')}
        >
          ↓
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={t('remove')}>
          ✕
        </Button>
      </div>
    </div>
  );
}

function describeStep(step: JourneyStep): string {
  if (step.type === 'wait') return `${step.waitHours}h`;
  if (step.type === 'send_email') return `email · ${step.templateId}`;
  if (step.type === 'send_wa') return `WhatsApp · ${step.waTemplateId}`;
  if (step.type === 'conditional') {
    return `if ${step.condition.field} ${step.condition.op} ${step.condition.value} → ${step.thenStep} else ${step.elseStep}`;
  }
  return '';
}
