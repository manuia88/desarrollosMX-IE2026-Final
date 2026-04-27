'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { QR_DESTINO_TYPES } from '@/features/marketing/schemas';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface QRGeneratorProps {
  onClose: () => void;
  onCreated: () => void;
}

export function QRGenerator({ onClose, onCreated }: QRGeneratorProps) {
  const t = useTranslations('Marketing');
  const [destinoType, setDestinoType] = useState<(typeof QR_DESTINO_TYPES)[number]>('proyecto');
  const [destinoId, setDestinoId] = useState('');
  const [copy, setCopy] = useState('');
  const [colorHex, setColorHex] = useState('#6366F1');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.marketing.qrCodes.create.useMutation({
    onSuccess: () => {
      setError(null);
      onCreated();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate({
      destinoType,
      destinoId,
      copy: copy || undefined,
      colorHex: colorHex || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('qr.generator.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <Card className="w-full max-w-md p-6">
        <h3
          className="mb-4 text-xl font-extrabold text-[var(--canon-white-pure)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('qr.generator.title')}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('qr.generator.destinoType')}
            </span>
            <select
              value={destinoType}
              onChange={(e) => setDestinoType(e.target.value as (typeof QR_DESTINO_TYPES)[number])}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            >
              {QR_DESTINO_TYPES.map((d) => (
                <option key={d} value={d}>
                  {t(`qr.destinoTypes.${d}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('qr.generator.destinoId')}
            </span>
            <input
              required
              type="text"
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('qr.generator.copy')}
            </span>
            <input
              type="text"
              maxLength={200}
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('qr.generator.color')}
            </span>
            <input
              type="text"
              pattern="^#[0-9A-Fa-f]{6}$"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
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
