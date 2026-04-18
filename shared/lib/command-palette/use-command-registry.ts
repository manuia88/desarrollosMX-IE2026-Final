'use client';

import { useSyncExternalStore } from 'react';
import { commandRegistry, groupedCommands, type PaletteCommand } from './registry';

let cachedSnapshot: PaletteCommand[] = [];
let cachedVersion = 0;
let currentVersion = 0;

commandRegistry.subscribe(() => {
  currentVersion += 1;
});

function getSnapshot(): PaletteCommand[] {
  if (currentVersion !== cachedVersion) {
    cachedSnapshot = commandRegistry.list();
    cachedVersion = currentVersion;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): PaletteCommand[] {
  return [];
}

export function useCommandRegistry(): {
  commands: PaletteCommand[];
  grouped: ReturnType<typeof groupedCommands>;
} {
  const commands = useSyncExternalStore(
    (l) => commandRegistry.subscribe(l),
    getSnapshot,
    getServerSnapshot,
  );
  return { commands, grouped: groupedCommands(commands) };
}
