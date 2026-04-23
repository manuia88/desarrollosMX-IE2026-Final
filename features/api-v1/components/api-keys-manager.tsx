'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import type { ListedKey } from '@/features/api-v1/schemas/keys';

interface CreateKeyResponse {
  readonly ok: true;
  readonly data: {
    readonly api_key_id: string;
    readonly raw_key: string;
    readonly name: string;
    readonly scopes: readonly string[];
    readonly expires_at: string | null;
  };
}

interface RevokeKeyResponse {
  readonly ok: true;
  readonly data: { readonly api_key_id: string; readonly revoked_at: string };
}

interface ApiKeysManagerProps {
  readonly initialKeys: readonly ListedKey[];
}

export function ApiKeysManager({ initialKeys }: ApiKeysManagerProps) {
  const t = useTranslations('ApiKeys');
  const [keys, setKeys] = useState<readonly ListedKey[]>(initialKeys);
  const [newName, setNewName] = useState('');
  const [tier, setTier] = useState('tier:free');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<CreateKeyResponse['data'] | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/keys/list', { cache: 'no-store' });
      const json = (await res.json()) as
        | { ok: true; data: { items: ListedKey[] } }
        | { ok: false; error: string };
      if ('ok' in json && json.ok) {
        setKeys(json.data.items);
      }
    } catch {
      // ignore
    }
  }, []);

  const createKey = useCallback(async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/keys/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), scopes: [tier] }),
      });
      const json = (await res.json()) as CreateKeyResponse | { ok: false; error: string };
      if (!('ok' in json) || !json.ok) {
        setError(('error' in json && json.error) || 'unknown_error');
        return;
      }
      setJustCreated(json.data);
      setNewName('');
      // Refresh list.
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network_error');
    } finally {
      setBusy(false);
    }
  }, [newName, tier, refresh]);

  const revokeKey = useCallback(
    async (id: string) => {
      const confirmed = window.confirm(t('confirmRevoke'));
      if (!confirmed) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/v1/keys/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ api_key_id: id }),
        });
        const json = (await res.json()) as RevokeKeyResponse | { ok: false; error: string };
        if (!('ok' in json) || !json.ok) {
          setError(('error' in json && json.error) || 'unknown_error');
          return;
        }
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'network_error');
      } finally {
        setBusy(false);
      }
    },
    [refresh, t],
  );

  const copyRawKey = useCallback(async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.raw_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('clipboard_unavailable');
    }
  }, [justCreated]);

  return (
    <section className="space-y-6" aria-labelledby="api-keys-title">
      {justCreated ? (
        <div
          role="alert"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          <p className="font-medium">{t('rawKeyOnceTitle')}</p>
          <p className="mt-1 text-muted-foreground">{t('rawKeyOnceBody')}</p>
          <code className="mt-3 block break-all rounded-md bg-muted p-3 font-mono text-sm">
            {justCreated.raw_key}
          </code>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void copyRawKey()}
              aria-label={t('copyRawKey')}
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              {copied ? t('copied') : t('copyRawKey')}
            </button>
            <button
              type="button"
              onClick={() => setJustCreated(null)}
              aria-label={t('close')}
              className="rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              {t('close')}
            </button>
          </div>
        </div>
      ) : null}

      <section aria-labelledby="create-key-title" className="rounded-md border p-6 space-y-3">
        <h2 id="create-key-title" className="text-lg font-medium">
          {t('createTitle')}
        </h2>
        <p className="text-sm text-neutral-600">{t('createBody')}</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('nameLabel')}</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={120}
              aria-label={t('nameLabel')}
              placeholder={t('namePlaceholder')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t('tierLabel')}</span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              aria-label={t('tierLabel')}
              className="rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              <option value="tier:free">{t('tierFree')}</option>
              <option value="tier:starter">{t('tierStarter')}</option>
              <option value="tier:pro">{t('tierPro')}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void createKey()}
            disabled={busy || newName.trim().length === 0}
            aria-label={t('createButton')}
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            {busy ? t('creating') : t('createButton')}
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {t('error', { code: error })}
          </p>
        ) : null}
      </section>

      <section aria-labelledby="keys-list-title" className="rounded-md border p-6">
        <h2 id="keys-list-title" className="text-lg font-medium">
          {t('listTitle')}
        </h2>
        {keys.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">{t('listEmpty')}</p>
        ) : (
          <ul className="mt-4 divide-y">
            {keys.map((k) => {
              const revoked = k.revoked_at !== null;
              return (
                <li key={k.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{k.name}</p>
                    <p className="text-xs text-neutral-600">
                      <code className="font-mono">{k.key_prefix}…</code>
                      <span className="mx-2">·</span>
                      {k.scopes.join(', ')}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {t('createdAt', { date: k.created_at })}
                      {k.last_used_at ? ` · ${t('lastUsedAt', { date: k.last_used_at })}` : ''}
                      {revoked && k.revoked_at
                        ? ` · ${t('revokedAt', { date: k.revoked_at })}`
                        : ''}
                    </p>
                  </div>
                  {revoked ? (
                    <span className="rounded-md bg-neutral-200 px-2 py-1 text-xs text-neutral-700">
                      {t('revokedBadge')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void revokeKey(k.id)}
                      disabled={busy}
                      aria-label={t('revokeButtonAria', { name: k.name })}
                      className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
                    >
                      {t('revokeButton')}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
