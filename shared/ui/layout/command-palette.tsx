'use client';

import { Command } from 'cmdk';
import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useCommandRegistry } from '@/shared/lib/command-palette/use-command-registry';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { grouped } = useCommandRegistry();

  useHotkeys(
    'mod+k',
    () => {
      setOpen((o) => !o);
    },
    { preventDefault: true, enableOnFormTags: true, enableOnContentEditable: true },
  );

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Palette"
      className="cmdk-root"
    >
      <div className="cmdk-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
      <div className="cmdk-panel">
        <Command.Input placeholder="Buscar, actuar o preguntar a la IA…" className="cmdk-input" />
        <Command.List className="cmdk-list">
          <Command.Empty className="cmdk-empty">
            Sin resultados. Pulsa Enter para preguntar a IA.
          </Command.Empty>
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
