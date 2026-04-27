'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { WA_TEMPLATE_CATEGORIES } from '@/features/marketing/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export interface WATemplateFormProps {
  onClose: () => void;
  onCreated: () => void;
}

export function WATemplateForm({ onClose, onCreated }: WATemplateFormProps) {
  const t = useTranslations('Marketing');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof WA_TEMPLATE_CATEGORIES)[number]>('marketing');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.marketing.waTemplates.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        name,
        category,
        body,
        placeholders: [],
        headerType: 'none',
        footer: footer || undefined,
        buttons: [],
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create failed');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('wa.form.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <Card className="w-full max-w-lg p-6">
        <div className="mb-4 flex items-center gap-2">
          <h3
            className="text-xl font-extrabold text-[var(--canon-white-pure)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('wa.form.title')}
          </h3>
          <DisclosurePill tone="violet">{t('wa.form.disclosureMeta')}</DisclosurePill>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('wa.form.name')}
            </span>
            <input
              required
              type="text"
              minLength={3}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('wa.form.category')}
            </span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof WA_TEMPLATE_CATEGORIES)[number])
              }
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            >
              {WA_TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`wa.categories.${c}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('wa.form.body')}
            </span>
            <textarea
              required
              minLength={1}
              maxLength={1024}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('wa.form.footer')}
            </span>
            <input
              type="text"
              maxLength={60}
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            />
          </label>

          {error ? <p className="text-xs text-rose-300">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={create.isPending}>
              {create.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
