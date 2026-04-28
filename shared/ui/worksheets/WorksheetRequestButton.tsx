'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/ui/primitives/canon';
import { WorksheetRequestModal } from '@/shared/ui/worksheets/WorksheetRequestModal';

export interface WorksheetRequestButtonProps {
  unitId: string;
  unitLabel?: string;
  disabled?: boolean;
}

export function WorksheetRequestButton({
  unitId,
  unitLabel,
  disabled,
}: WorksheetRequestButtonProps) {
  const t = useTranslations('dev.worksheets.requestButton');
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {t('label')}
      </Button>
      <WorksheetRequestModal
        unitId={unitId}
        {...(unitLabel ? { unitLabel } : {})}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
