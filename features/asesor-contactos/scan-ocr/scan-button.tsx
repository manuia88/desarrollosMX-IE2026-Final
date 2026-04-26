'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ScanOcrDialog } from './scan-ocr-dialog';

export function ScanOcrButton() {
  const t = useTranslations('AsesorContactos.scanOcr');
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--canon-radius-pill)',
          border: '1px solid var(--canon-border-2)',
          background: 'transparent',
          color: 'var(--canon-cream-2)',
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {t('trigger')}
      </button>
      {open ? <ScanOcrDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}
