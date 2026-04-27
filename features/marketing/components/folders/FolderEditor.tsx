'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface FolderEditorProps {
  onClose: () => void;
  onCreated: () => void;
}

export function FolderEditor({ onClose, onCreated }: FolderEditorProps) {
  const t = useTranslations('Marketing');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = trpc.marketing.folders.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({ title, slug });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'create failed');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('folders.editor.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <Card className="w-full max-w-md p-6">
        <h3
          className="mb-4 text-xl font-extrabold text-[var(--canon-white-pure)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('folders.editor.title')}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('folders.editor.titleField')}
            </span>
            <input
              required
              minLength={3}
              maxLength={200}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold text-[var(--canon-white-pure)]">
              {t('folders.editor.slug')}
            </span>
            <input
              required
              type="text"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              minLength={3}
              maxLength={80}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="rounded-lg border border-[color:rgba(255,255,255,0.14)] bg-[color:rgba(0,0,0,0.20)] px-3 py-2 text-[var(--canon-white-pure)]"
              placeholder="cliente-rodrigo"
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
