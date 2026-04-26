'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { useShortcuts } from '@/shared/hooks/use-shortcuts';
import {
  IconCalendarPlus,
  IconCamera,
  IconLayoutGrid,
  IconPlus,
  IconStickyNote,
  IconUserPlus,
  IconX,
} from '@/shared/ui/icons/canon-icons';

export type QuickActionId = 'lead' | 'visita' | 'comparable' | 'nota' | 'screenshot';

interface QuickActionsFloaterProps {
  onAction: (action: QuickActionId) => void;
}

const ACTIONS: {
  id: QuickActionId;
  Icon: typeof IconUserPlus;
  key: string;
  combo: string;
  kbdLabel: string;
}[] = [
  { id: 'lead', Icon: IconUserPlus, key: 'fab.lead', combo: 'shift+l', kbdLabel: '⇧L' },
  { id: 'visita', Icon: IconCalendarPlus, key: 'fab.visita', combo: 'shift+v', kbdLabel: '⇧V' },
  {
    id: 'comparable',
    Icon: IconLayoutGrid,
    key: 'fab.comparable',
    combo: 'shift+c',
    kbdLabel: '⇧C',
  },
  { id: 'nota', Icon: IconStickyNote, key: 'fab.nota', combo: 'shift+n', kbdLabel: '⇧N' },
  { id: 'screenshot', Icon: IconCamera, key: 'fab.screenshot', combo: 'shift+s', kbdLabel: '⇧S' },
];

export function QuickActionsFloater({ onAction }: QuickActionsFloaterProps) {
  const t = useTranslations('AsesorShell');
  const [open, setOpen] = useState(false);

  useShortcuts(
    Object.fromEntries(
      ACTIONS.map((a) => [
        a.combo,
        (event: KeyboardEvent) => {
          event.preventDefault();
          onAction(a.id);
        },
      ]),
    ),
  );

  const fabStyle: CSSProperties = {
    background: 'var(--canon-gradient)',
    boxShadow: 'var(--shadow-canon-spotlight)',
    color: 'white',
  };

  return (
    <div className="fixed bottom-6 right-[79px] z-50 flex flex-col items-end gap-3">
      {open ? (
        <ul
          id="quick-actions-menu"
          aria-label={t('fab.menuAria')}
          className="flex flex-col items-end gap-2"
        >
          {ACTIONS.map((action) => {
            const Icon = action.Icon;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  role="menuitem"
                  aria-keyshortcuts={action.combo.replace('shift+', 'Shift+').toUpperCase()}
                  onClick={() => {
                    onAction(action.id);
                    setOpen(false);
                  }}
                  className="inline-flex h-12 min-w-[220px] items-center gap-3 rounded-full border px-4 transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)]"
                  style={{
                    background: 'rgba(19,24,42,0.92)',
                    borderColor: 'var(--canon-border-2)',
                    color: 'var(--canon-cream)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                >
                  <Icon size={18} />
                  <span
                    className="flex-1 text-left text-[13px] font-medium"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {t(action.key)}
                  </span>
                  <kbd
                    className="rounded border px-1.5 py-0.5 text-[10px] font-mono"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.10)',
                      color: 'var(--canon-cream-3)',
                    }}
                  >
                    {action.kbdLabel}
                  </kbd>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <button
        type="button"
        aria-label={t('fab.toggleAria')}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="quick-actions-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canon-bg)]"
        style={fabStyle}
      >
        {open ? <IconX size={22} /> : <IconPlus size={22} />}
      </button>
    </div>
  );
}
