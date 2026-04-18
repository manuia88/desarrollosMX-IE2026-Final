import type { ComponentType } from 'react';

export type CommandGroup = 'Navegación' | 'IA' | 'Acciones' | 'Ajustes';

export type PaletteCommand = {
  id: string;
  label: string;
  group: CommandGroup;
  shortcut?: string[];
  Icon?: ComponentType<{ className?: string }>;
  keywords?: string[];
  when?: () => boolean;
  run: () => void | Promise<void>;
};

type Listener = () => void;

class CommandRegistry {
  private readonly commands = new Map<string, PaletteCommand>();
  private readonly listeners = new Set<Listener>();

  register(cmd: PaletteCommand): () => void {
    this.commands.set(cmd.id, cmd);
    this.notify();
    return () => this.unregister(cmd.id);
  }

  unregister(id: string): void {
    if (this.commands.delete(id)) {
      this.notify();
    }
  }

  list(): PaletteCommand[] {
    const all = Array.from(this.commands.values());
    return all.filter((c) => !c.when || c.when());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

export const commandRegistry = new CommandRegistry();

export function groupedCommands(
  commands: PaletteCommand[],
): Record<CommandGroup, PaletteCommand[]> {
  const empty: Record<CommandGroup, PaletteCommand[]> = {
    Navegación: [],
    IA: [],
    Acciones: [],
    Ajustes: [],
  };
  for (const cmd of commands) {
    empty[cmd.group].push(cmd);
  }
  return empty;
}
