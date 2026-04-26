'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { useCommandPalette } from '@/features/asesor-shell/hooks/use-command-palette';
import { ASESOR_NAV_ITEMS } from '@/features/asesor-shell/lib/nav-items';
import { IconSearch } from '@/shared/ui/icons/canon-icons';

interface PaletteEntry {
  id: string;
  group: 'recientes' | 'navegacion' | 'acciones' | 'ia' | 'ajustes';
  labelKey: string;
  shortcut?: string;
  run: () => void | Promise<void>;
  recentLabel?: string;
}

import type { QuickActionId } from '@/features/asesor-shell/components/QuickActionsFloater';

interface CommandPaletteProps {
  locale: string;
  onAction?: (id: QuickActionId) => void;
}

export function CommandPalette({ locale, onAction }: CommandPaletteProps) {
  const t = useTranslations('AsesorShell');
  const router = useRouter();
  const palette = useCommandPalette();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!palette.isOpen) setQuery('');
  }, [palette.isOpen]);

  const navEntries: PaletteEntry[] = useMemo(
    () =>
      ASESOR_NAV_ITEMS.map((item) => ({
        id: `nav.${item.id}`,
        group: 'navegacion' as const,
        labelKey: `palette.commands.nav.${item.id}`,
        run: () => router.push(`/${locale}${item.route}`),
      })),
    [router, locale],
  );

  const actionEntries: PaletteEntry[] = useMemo(
    () => [
      {
        id: 'action.create.lead',
        group: 'acciones' as const,
        labelKey: 'palette.commands.actions.lead',
        shortcut: '⇧L',
        run: () => onAction?.('lead'),
      },
      {
        id: 'action.create.visita',
        group: 'acciones' as const,
        labelKey: 'palette.commands.actions.visita',
        shortcut: '⇧V',
        run: () => onAction?.('visita'),
      },
      {
        id: 'action.create.comparable',
        group: 'acciones' as const,
        labelKey: 'palette.commands.actions.comparable',
        shortcut: '⇧C',
        run: () => onAction?.('comparable'),
      },
      {
        id: 'action.create.nota',
        group: 'acciones' as const,
        labelKey: 'palette.commands.actions.nota',
        shortcut: '⇧N',
        run: () => onAction?.('nota'),
      },
      {
        id: 'action.capture.screenshot',
        group: 'acciones' as const,
        labelKey: 'palette.commands.actions.screenshot',
        shortcut: '⇧S',
        run: () => onAction?.('screenshot'),
      },
    ],
    [onAction],
  );

  const settingsEntries: PaletteEntry[] = useMemo(
    () => [
      {
        id: 'settings.profile',
        group: 'ajustes' as const,
        labelKey: 'palette.commands.settings.profile',
        run: () => router.push(`/${locale}/profile`),
      },
    ],
    [router, locale],
  );

  const allEntries = useMemo(
    () => [...navEntries, ...actionEntries, ...settingsEntries],
    [navEntries, actionEntries, settingsEntries],
  );

  const recentEntries: PaletteEntry[] = useMemo(() => {
    if (query !== '') return [];
    return palette.recents
      .map((id) => allEntries.find((e) => e.id === id))
      .filter((e): e is PaletteEntry => Boolean(e))
      .map((entry) => ({ ...entry, group: 'recientes' as const }));
  }, [palette.recents, query, allEntries]);

  if (!palette.isOpen) return null;

  const backdropStyle: CSSProperties = {
    background: 'rgba(6,8,15,0.72)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  };
  const panelStyle: CSSProperties = {
    background: 'var(--surface-elevated)',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    color: 'var(--canon-cream)',
  };

  const handleSelect = (entry: PaletteEntry) => {
    palette.addRecent(entry.id);
    palette.close();
    void entry.run();
  };

  const groups: Array<{ key: PaletteEntry['group']; entries: PaletteEntry[] }> = [
    { key: 'recientes', entries: recentEntries },
    { key: 'acciones', entries: actionEntries },
    { key: 'navegacion', entries: navEntries },
    { key: 'ajustes', entries: settingsEntries },
  ];

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop is intentionally non-focusable; ESC closes via useCommandPalette keybind
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center px-6 pt-[15vh]"
      style={backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) palette.close();
      }}
      role="presentation"
    >
      <Command
        loop
        label={t('palette.inputAria')}
        className="w-full max-w-[640px] overflow-hidden"
        style={panelStyle}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: 'var(--canon-border)' }}
        >
          <IconSearch size={18} className="text-[var(--canon-cream-2)]" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.inputAria')}
            className="flex-1 bg-transparent text-[14px] text-[var(--canon-cream)] outline-none placeholder:text-[var(--canon-cream-3)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <kbd
            className="rounded border px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: 'rgba(255,255,255,0.10)',
              color: 'var(--canon-cream-3)',
            }}
          >
            {t('palette.escHint')}
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-[13px] text-[var(--canon-cream-2)]">
            {t('palette.empty')}
          </Command.Empty>
          {groups.map((group) =>
            group.entries.length > 0 ? (
              <Command.Group
                key={group.key}
                heading={t(`palette.sections.${group.key}`)}
                className="mb-2"
              >
                {group.entries.map((entry) => (
                  <Command.Item
                    key={entry.id}
                    value={`${t(entry.labelKey)} ${entry.id}`}
                    onSelect={() => handleSelect(entry)}
                    className="flex h-11 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[13px] aria-selected:bg-[color:rgba(99,102,241,0.16)] aria-selected:text-[color:var(--canon-indigo-2)]"
                  >
                    <span className="flex-1" style={{ fontFamily: 'var(--font-body)' }}>
                      {t(entry.labelKey)}
                    </span>
                    {entry.shortcut ? (
                      <kbd
                        className="rounded border px-1.5 py-0.5 text-[10px] font-mono"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderColor: 'rgba(255,255,255,0.10)',
                          color: 'var(--canon-cream-3)',
                        }}
                      >
                        {entry.shortcut}
                      </kbd>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null,
          )}
        </Command.List>
      </Command>
    </div>
  );
}
