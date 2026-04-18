'use client';

import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { AI_ASK_EVENT, dispatchBrowserEvent } from '@/shared/lib/command-palette/seed-commands';
import { useCommandRegistry } from '@/shared/lib/command-palette/use-command-registry';
import { captureUIEvent } from '@/shared/lib/telemetry/events';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { grouped } = useCommandRegistry();

  useHotkeys(
    'mod+k',
    () => {
      setOpen((o) => !o);
    },
    { preventDefault: true, enableOnFormTags: true, enableOnContentEditable: true },
  );

  useHotkeys(
    'mod+/',
    () => {
      setOpen(false);
      dispatchBrowserEvent(AI_ASK_EVENT);
    },
    { preventDefault: true, enableOnFormTags: true, enableOnContentEditable: true },
  );

  useEffect(() => {
    if (!open) return;
    captureUIEvent(null, 'command_palette_opened');
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const askAI = (query: string) => {
    setOpen(false);
    dispatchBrowserEvent(AI_ASK_EVENT, { query });
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
      className="cmdk-root"
    >
      <div className="cmdk-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
      <div className="cmdk-panel">
        <Command.Input
          placeholder="Buscar, actuar o preguntar a la IA…"
          className="cmdk-input"
          value={search}
          onValueChange={setSearch}
        />
        <Command.List className="cmdk-list">
          <Command.Empty className="cmdk-empty">
            <button type="button" className="cmdk-ask-ai" onClick={() => askAI(search)}>
              Preguntar a la IA: <strong>{search || '…'}</strong>
            </button>
          </Command.Empty>

          {search.trim().length > 0 ? (
            <Command.Group heading="IA" className="cmdk-group">
              <Command.Item
                value={`preguntar-ia-${search}`}
                onSelect={() => askAI(search)}
                className="cmdk-item"
              >
                <span className="cmdk-item-label">
                  Preguntar a la IA: <strong>{search}</strong>
                </span>
                <span className="cmdk-item-shortcut">
                  <kbd>⌘</kbd>
                  <kbd>/</kbd>
                </span>
              </Command.Item>
            </Command.Group>
          ) : null}

          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((groupName) => {
            const items = grouped[groupName];
            if (items.length === 0) return null;
            return (
              <Command.Group key={groupName} heading={groupName} className="cmdk-group">
                {items.map((cmd) => (
                  <Command.Item
                    key={cmd.id}
                    value={`${cmd.label} ${(cmd.keywords ?? []).join(' ')}`}
                    onSelect={async () => {
                      setOpen(false);
                      await cmd.run();
                    }}
                    className="cmdk-item"
                  >
                    {cmd.Icon ? <cmd.Icon className="cmdk-item-icon" /> : null}
                    <span className="cmdk-item-label">{cmd.label}</span>
                    {cmd.shortcut ? (
                      <span className="cmdk-item-shortcut">
                        {cmd.shortcut.map((k) => (
                          <kbd key={k}>{k}</kbd>
                        ))}
                      </span>
                    ) : null}
                  </Command.Item>
                ))}
              </Command.Group>
            );
          })}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
