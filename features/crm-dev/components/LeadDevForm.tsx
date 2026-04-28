'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/primitives/canon';
import { useCreateDevLead, useInvalidateCrmDevQueries } from '../hooks/use-crm-dev';
import { type CreateLeadInput, createLeadInput, LEAD_SOURCES } from '../schemas';

export interface LeadDevFormProps {
  readonly defaultZoneId: string;
  readonly onCreated?: (leadId: string) => void;
  readonly onCancel?: () => void;
}

export function LeadDevForm({ defaultZoneId, onCreated, onCancel }: LeadDevFormProps) {
  const t = useTranslations('dev.crm.form');
  const create = useCreateDevLead();
  const invalidate = useInvalidateCrmDevQueries();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadInput) as never,
    defaultValues: {
      countryCode: 'MX',
      zoneId: defaultZoneId,
      source: 'landing',
    },
  });

  const onSubmit = handleSubmit(async (data) => {
    const result = await create.mutateAsync(data);
    invalidate.invalidateLeads();
    onCreated?.(result.leadId);
  });

  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--canon-cream-2)',
    fontWeight: 600,
    marginBottom: 4,
    display: 'block',
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--canon-radius-input)',
    border: '1px solid var(--canon-border-2)',
    background: 'var(--canon-bg)',
    color: 'var(--canon-cream)',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
  };

  const errorStyle: CSSProperties = {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 4,
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor="contactName" style={labelStyle}>
          {t('contactName.label')}
        </label>
        <input
          id="contactName"
          type="text"
          {...register('contactName')}
          style={inputStyle}
          aria-invalid={!!errors.contactName}
        />
        {errors.contactName ? <span style={errorStyle}>{t('contactName.required')}</span> : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label htmlFor="contactEmail" style={labelStyle}>
            {t('contactEmail.label')}
          </label>
          <input id="contactEmail" type="email" {...register('contactEmail')} style={inputStyle} />
        </div>
        <div>
          <label htmlFor="contactPhone" style={labelStyle}>
            {t('contactPhone.label')}
          </label>
          <input id="contactPhone" type="tel" {...register('contactPhone')} style={inputStyle} />
        </div>
      </div>

      <div>
        <label htmlFor="source" style={labelStyle}>
          {t('source.label')}
        </label>
        <select id="source" {...register('source')} style={inputStyle}>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {t(`source.options.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label htmlFor="budgetMin" style={labelStyle}>
            {t('budgetMin.label')}
          </label>
          <input
            id="budgetMin"
            type="number"
            min={0}
            {...register('budgetMin', { valueAsNumber: true })}
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="budgetMax" style={labelStyle}>
            {t('budgetMax.label')}
          </label>
          <input
            id="budgetMax"
            type="number"
            min={0}
            {...register('budgetMax', { valueAsNumber: true })}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label htmlFor="notes" style={labelStyle}>
          {t('notes.label')}
        </label>
        <textarea id="notes" rows={3} {...register('notes')} style={inputStyle} />
      </div>

      {create.error ? <p style={errorStyle}>{create.error.message}</p> : null}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('cancel')}
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  );
}
