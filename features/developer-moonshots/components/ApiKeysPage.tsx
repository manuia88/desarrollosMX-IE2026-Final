'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

const ALL_SCOPES = ['scores:read', 'pipeline:read', 'simulate:write', 'alerts:read'] as const;
type Scope = (typeof ALL_SCOPES)[number];

export function ApiKeysPage() {
  const t = useTranslations('dev.moonshots.apiEnterprise');
  const utils = trpc.useUtils();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<Scope[]>(['scores:read', 'pipeline:read', 'alerts:read']);
  const [createdPlaintext, setCreatedPlaintext] = useState<string | null>(null);

  const listQuery = trpc.developerMoonshots.listApiKeys.useQuery();
  const createMutation = trpc.developerMoonshots.createApiKey.useMutation({
    onSuccess: (data) => {
      setCreatedPlaintext(data.plaintextKey);
      setName('');
      void utils.developerMoonshots.listApiKeys.invalidate();
    },
  });
  const revokeMutation = trpc.developerMoonshots.revokeApiKey.useMutation({
    onSuccess: () => void utils.developerMoonshots.listApiKeys.invalidate(),
  });

  const toggleScope = (s: Scope) => {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--canon-cream)', fontFamily: 'var(--font-display)' }}
        >
          {t('title')}
        </h1>
        <span className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
          {t('rateLimit')}
        </span>
      </header>

      <Card className="space-y-3 p-6">
        <label className="flex flex-col gap-1">
          <span
            className="text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            Nombre
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Power BI dashboard"
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--canon-cream)',
            }}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_SCOPES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggleScope(s)}
              className="rounded-full px-3 py-1 text-[11px]"
              style={{
                background: scopes.includes(s) ? 'rgba(99,102,241,0.32)' : 'rgba(255,255,255,0.06)',
                color: scopes.includes(s) ? '#fff' : 'var(--canon-cream-3)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="primary"
          disabled={name.length < 3 || scopes.length === 0 || createMutation.isPending}
          onClick={() => createMutation.mutate({ name, scopes })}
        >
          {t('generateKeyCta')}
        </Button>
      </Card>

      {createdPlaintext && (
        <Card className="space-y-2 p-6" style={{ borderColor: 'rgba(34,197,94,0.4)' }}>
          <div
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: '#86efac' }}
          >
            Guarda esta key — solo se muestra una vez
          </div>
          <code
            className="block break-all rounded-lg p-3 text-[12px]"
            style={{ background: 'rgba(0,0,0,0.4)', color: '#86efac', fontFamily: 'ui-monospace' }}
          >
            {createdPlaintext}
          </code>
          <button
            type="button"
            onClick={() => setCreatedPlaintext(null)}
            className="text-[11px] underline"
            style={{ color: 'var(--canon-cream-3)' }}
          >
            Ocultar
          </button>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-3 text-base font-semibold" style={{ color: 'var(--canon-cream)' }}>
          Keys activas
        </h2>
        <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {(listQuery.data ?? []).map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div style={{ color: 'var(--canon-cream)' }}>{k.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--canon-cream-3)' }}>
                  {k.keyPrefix}… · {k.scopes.join(', ')} ·{' '}
                  {new Date(k.createdAt).toLocaleDateString('es-MX')}
                  {k.revokedAt ? ' · revoked' : ''}
                </div>
              </div>
              {!k.revokedAt && (
                <button
                  type="button"
                  onClick={() => revokeMutation.mutate({ keyId: k.id })}
                  className="rounded-full border px-3 py-1 text-[11px]"
                  style={{ borderColor: 'rgba(248,113,113,0.4)', color: '#fca5a5' }}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {(listQuery.data ?? []).length === 0 && (
            <li className="py-3 text-sm" style={{ color: 'var(--canon-cream-3)' }}>
              Sin API keys.
            </li>
          )}
        </ul>
      </Card>

      <Card className="p-6 text-[12px]" style={{ color: 'var(--canon-cream-2)' }}>
        <a
          href="/api/v1/developer/openapi.json"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {t('openapiLink')}
        </a>
      </Card>
    </div>
  );
}
