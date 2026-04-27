'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';
import { QRGenerator } from './QRGenerator';

interface QRRow {
  id: string;
  destino_type: string;
  short_url: string;
  scan_count: number | null;
}

export function QRSection() {
  const t = useTranslations('Marketing');
  const [open, setOpen] = useState(false);
  const list = trpc.marketing.qrCodes.list.useQuery({ limit: 50 });
  const utils = trpc.useUtils();
  const rows = (list.data ?? []) as unknown as QRRow[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[var(--canon-white-pure)]">
          {t('qr.heading', { count: rows.length })}
        </h2>
        <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
          {t('qr.actions.new')}
        </Button>
      </div>

      {list.isLoading ? (
        <Card className="p-6 text-sm text-[color:rgba(255,255,255,0.65)]">
          {t('common.loading')}
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-[color:rgba(255,255,255,0.70)]">{t('qr.empty.body')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.map((qr) => (
            <Card key={qr.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-[var(--canon-white-pure)]">
                  {qr.destino_type} · {qr.short_url}
                </span>
                <span className="text-xs text-[color:rgba(255,255,255,0.65)]">
                  {t('qr.scans', { n: qr.scan_count ?? 0 })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <QRGenerator
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            utils.marketing.qrCodes.list.invalidate();
          }}
        />
      ) : null}
    </div>
  );
}
