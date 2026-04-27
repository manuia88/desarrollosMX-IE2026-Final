'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { FolderEditor } from './FolderEditor';

export function FoldersSection() {
  const t = useTranslations('Marketing');
  const [open, setOpen] = useState(false);
  const list = trpc.marketing.folders.list.useQuery({ limit: 50, onlyActive: false });
  const utils = trpc.useUtils();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">
          {t('folders.heading', { count: list.data?.length ?? 0 })}
        </h2>
        <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
          {t('folders.actions.new')}
        </Button>
      </div>

      {list.isLoading ? (
        <Card className="p-6 text-sm text-[color:rgba(255,255,255,0.65)]">
          {t('common.loading')}
        </Card>
      ) : !list.data || list.data.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[color:rgba(255,255,255,0.70)]">{t('folders.empty.body')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.data.map((f) => (
            <Card key={f.id} className="flex flex-col gap-2 p-4">
              <span className="text-sm font-semibold text-[var(--canon-white-pure)]">
                {f.title}
              </span>
              <a
                href={`/radar/${f.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[color:var(--canon-indigo-2)] hover:underline"
              >
                /radar/{f.slug}
              </a>
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <FolderEditor
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            utils.marketing.folders.list.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
