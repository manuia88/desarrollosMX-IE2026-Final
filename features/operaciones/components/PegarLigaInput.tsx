'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';

export function PegarLigaInput() {
  // STUB ADR-018 — activar en FASE 22 H2 con [dependencia: scrapers EasyBroker / ML / Inmuebles24]
  const t = useTranslations('Operaciones');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(t('pegarLiga.stubMessage'));
  };

  return (
    <Card variant="recessed" className="p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--canon-white-pure)]">
          {t('pegarLiga.title')}
        </h3>
        <DisclosurePill tone="violet">{t('pegarLiga.badge')}</DisclosurePill>
      </div>
      <p className="mt-1 text-xs text-[var(--canon-cream-2)]">{t('pegarLiga.helper')}</p>
      <div className="mt-3 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t('pegarLiga.placeholder')}
          className="flex-1 rounded-full border border-[var(--canon-border)] bg-[var(--surface-elevated)] px-4 py-2 text-sm text-[var(--canon-white-pure)] placeholder:text-[var(--canon-cream-3)] focus:outline-none focus:ring-2 focus:ring-[var(--canon-indigo-3)]"
          aria-label={t('pegarLiga.label')}
        />
        <Button
          variant="ghost"
          size="md"
          type="button"
          onClick={handleSubmit}
          aria-label={t('pegarLiga.action')}
        >
          {t('pegarLiga.action')}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-xs" role="status" style={{ color: 'var(--mod-tareas)' }}>
          {error}
        </p>
      ) : null}
    </Card>
  );
}
