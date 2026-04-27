'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card, DisclosurePill } from '@/shared/ui/primitives/canon';
import { WATemplateForm } from './WATemplateForm';

interface WATemplateRow {
  id: string;
  name: string;
  body: string;
  status: string;
}

export function WATemplatesSection() {
  const t = useTranslations('Marketing');
  const [open, setOpen] = useState(false);
  const list = trpc.marketing.waTemplates.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();
  const rows = (list.data ?? []) as unknown as WATemplateRow[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">
            {t('wa.heading', { count: rows.length })}
          </h2>
          <DisclosurePill tone="violet">{t('wa.disclosureH1')}</DisclosurePill>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
          {t('wa.actions.new')}
        </Button>
      </div>

      {list.isLoading ? (
        <Card className="p-6 text-sm text-[color:rgba(255,255,255,0.65)]">
          {t('common.loading')}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[color:rgba(255,255,255,0.70)]">{t('wa.empty.body')}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((tpl) => (
            <Card key={tpl.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--canon-white-pure)]">
                  {tpl.name}
                </span>
                <span className="rounded-full bg-[color:rgba(255,255,255,0.08)] px-2 py-0.5 text-[11px] font-semibold text-[color:rgba(255,255,255,0.65)]">
                  {tpl.status}
                </span>
              </div>
              <p className="text-xs text-[color:rgba(255,255,255,0.65)] whitespace-pre-wrap">
                {tpl.body}
              </p>
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <WATemplateForm
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            utils.marketing.waTemplates.list.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
