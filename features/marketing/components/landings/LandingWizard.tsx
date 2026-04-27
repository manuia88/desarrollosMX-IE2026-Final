'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LANDING_TEMPLATES, type LandingTemplate } from '@/features/marketing/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface LandingWizardProps {
  onClose: () => void;
  onCreated: () => void;
}

export function LandingWizard({ onClose, onCreated }: LandingWizardProps) {
  const t = useTranslations('Marketing');
  const [slug, setSlug] = useState('');
  const [template, setTemplate] = useState<LandingTemplate>('hero');
  const [headline, setHeadline] = useState('');
  const [cta, setCta] = useState('Conoce más');
  const [primary, setPrimary] = useState('#6366F1');
  const [projectId, setProjectId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.marketing.landings.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        countryCode: 'MX',
        slug,
        template,
        projectIds: projectId ? [projectId] : [],
        brandColors: { primary },
        copy: { headline, cta },
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
      aria-label={t('landings.wizard.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <Card className="w-full max-w-lg p-6">
        <h3
          className="mb-4 text-xl font-extrabold text-[var(--canon-white-pure)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('landings.wizard.title')}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('landings.wizard.slug')}
            </span>
            <input
              required
              type="text"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              minLength={3}
              maxLength={80}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)] placeholder:text-[color:rgba(255,255,255,0.35)] focus:border-[color:var(--canon-indigo)] focus:outline-none"
              placeholder="torre-napoles"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('landings.wizard.template')}
            </span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as LandingTemplate)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)] focus:border-[color:var(--canon-indigo)] focus:outline-none"
            >
              {LANDING_TEMPLATES.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {t(`landings.templates.${tpl}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('landings.wizard.headline')}
            </span>
            <input
              required
              type="text"
              maxLength={120}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)] focus:border-[color:var(--canon-indigo)] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('landings.wizard.cta')}
            </span>
            <input
              required
              type="text"
              maxLength={40}
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)] focus:border-[color:var(--canon-indigo)] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('landings.wizard.brandPrimary')}
            </span>
            <input
              required
              type="text"
              pattern="^#[0-9A-Fa-f]{6}$"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)] focus:border-[color:var(--canon-indigo)] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('landings.wizard.firstProjectId')}
            </span>
            <input
              required
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)] focus:border-[color:var(--canon-indigo)] focus:outline-none"
              placeholder="uuid"
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
