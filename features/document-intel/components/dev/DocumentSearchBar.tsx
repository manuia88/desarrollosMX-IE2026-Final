'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Card } from '@/shared/ui/primitives/canon';

export interface DocumentSearchBarProps {
  readonly locale: string;
}

export function DocumentSearchBar({ locale }: DocumentSearchBarProps) {
  const t = useTranslations('dev.documents.search');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  const searchQuery = trpc.documentIntel.searchDocuments.useQuery(
    { query: debounced, limit: 10 },
    { enabled: debounced.length >= 3 },
  );

  const results = searchQuery.data?.results ?? [];
  const showDropdown = open && debounced.length >= 3;

  return (
    <div className="relative" style={{ width: '100%' }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        className="w-full rounded-md p-2 text-sm"
        style={{
          background: 'var(--canon-bg)',
          border: '1px solid var(--canon-border)',
          color: 'var(--canon-cream)',
        }}
      />
      {showDropdown ? (
        <Card variant="elevated" className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto p-2">
          {searchQuery.isLoading ? (
            <p
              className="px-2 py-3 text-center text-xs"
              style={{ color: 'var(--canon-cream)', opacity: 0.6 }}
            >
              {t('loading')}
            </p>
          ) : query.trim().length < 3 ? (
            <p
              className="px-2 py-3 text-center text-xs"
              style={{ color: 'var(--canon-cream)', opacity: 0.6 }}
            >
              {t('empty')}
            </p>
          ) : results.length === 0 ? (
            <p
              className="px-2 py-3 text-center text-xs"
              style={{ color: 'var(--canon-cream)', opacity: 0.6 }}
            >
              {t('no_results')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((r) => {
                const snippet =
                  r.chunk_text.length > 220 ? `${r.chunk_text.slice(0, 220)}…` : r.chunk_text;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/${locale}/desarrolladores/inventario/documentos/ai/${r.job_id}`,
                        )
                      }
                      className="block w-full rounded-md p-2 text-left"
                      style={{
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'var(--canon-cream)',
                      }}
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold">
                          {r.original_filename ?? r.job_id.slice(0, 8)}
                        </span>
                        {r.doc_type ? (
                          <span className="font-mono text-[10px]" style={{ opacity: 0.6 }}>
                            {r.doc_type}
                          </span>
                        ) : null}
                        <span
                          className="ml-auto text-[10px]"
                          style={{
                            padding: '1px 6px',
                            borderRadius: 'var(--canon-radius-pill)',
                            background: 'rgba(99,102,241,0.12)',
                            color: '#a5b4fc',
                          }}
                        >
                          {t('similarity')}: {(r.similarity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--canon-cream)', opacity: 0.75 }}>
                        {snippet}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
