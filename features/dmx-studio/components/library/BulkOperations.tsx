'use client';

// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Bulk operations sticky bottom bar.
// Visible solo cuando selectedIds.size > 0. CTA: download (sequential signed urls)
// + share WA (single message con todos los links).

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';

export interface BulkOperationsProps {
  readonly selectedIds: ReadonlySet<string>;
  readonly onClear: () => void;
}

const wrapperStyle: CSSProperties = {
  position: 'sticky',
  bottom: '16px',
  zIndex: 30,
  borderRadius: 'var(--canon-radius-card)',
  background: 'var(--surface-spotlight)',
  border: '1px solid var(--canon-border-2)',
  boxShadow: 'var(--shadow-canon-spotlight)',
  padding: '14px 18px',
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
};

const countStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '14px',
  color: '#FFFFFF',
};

export function BulkOperations({ selectedIds, onClear }: BulkOperationsProps) {
  const t = useTranslations('Studio.library');
  const bulkSignedUrls = trpc.studio.library.bulkSignedUrls.useMutation();
  const bulkShareMessage = trpc.studio.library.bulkShareMessage.useMutation();

  const handleDownload = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await bulkSignedUrls.mutateAsync({ videoOutputIds: ids });
    if (typeof window === 'undefined') return;
    for (const item of result.items) {
      if (!item.signedUrl) continue;
      window.open(item.signedUrl, '_blank', 'noopener,noreferrer');
    }
  }, [bulkSignedUrls, selectedIds]);

  const handleShare = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await bulkShareMessage.mutateAsync({ videoOutputIds: ids });
    if (typeof window === 'undefined') return;
    const url = `https://wa.me/?text=${encodeURIComponent(result.whatsappMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [bulkShareMessage, selectedIds]);

  if (selectedIds.size === 0) return null;

  return (
    <section
      aria-label={t('bulkSelectionCount', { count: selectedIds.size })}
      data-testid="library-bulk-operations"
      style={wrapperStyle}
    >
      <span style={countStyle}>{t('bulkSelectionCount', { count: selectedIds.size })}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleDownload}
          disabled={bulkSignedUrls.isPending}
          aria-label={t('bulkDownloadCta')}
          data-testid="library-bulk-download"
        >
          {t('bulkDownloadCta')}
        </Button>
        <Button
          type="button"
          variant="glass"
          size="sm"
          onClick={handleShare}
          disabled={bulkShareMessage.isPending}
          aria-label={t('bulkShareCta')}
          data-testid="library-bulk-share"
        >
          {t('bulkShareCta')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label={t('bulkClearLabel')}
          data-testid="library-bulk-clear"
        >
          {t('bulkClearLabel')}
        </Button>
      </div>
    </section>
  );
}
