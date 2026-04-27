'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/ui/primitives/canon/button';

export interface TareaMenuProps {
  canReassign: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReassign?: () => void;
}

export function TareaMenu({ canReassign, onEdit, onDelete, onReassign }: TareaMenuProps) {
  const t = useTranslations('Tareas');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (confirmDelete) {
    return (
      <div role="dialog" aria-label={t('menu.confirmDeleteAria')} className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDelete(false)}
          aria-label={t('menu.cancel')}
        >
          {t('menu.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setConfirmDelete(false);
            onDelete();
          }}
          aria-label={t('menu.confirmDelete')}
        >
          {t('menu.confirmDelete')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" onClick={onEdit} aria-label={t('menu.edit')}>
        {t('menu.edit')}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirmDelete(true)}
        aria-label={t('menu.delete')}
      >
        {t('menu.delete')}
      </Button>
      {canReassign && onReassign ? (
        <Button variant="ghost" size="sm" onClick={onReassign} aria-label={t('menu.reassign')}>
          {t('menu.reassign')}
        </Button>
      ) : null}
    </div>
  );
}
