import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { commandRegistry, type PaletteCommand } from './registry';

type Router = { push: (href: string) => void };

export const AI_ASK_EVENT = 'dmx:ai-ask';
export const LOCALE_MODAL_EVENT = 'dmx:locale-modal';
export const THEME_TOGGLE_EVENT = 'dmx:theme-toggle';

export function dispatchBrowserEvent(name: string, detail?: unknown): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function buildSeedCommands(
  router: Router,
  supabase: SupabaseClient<Database>,
): PaletteCommand[] {
  return [
    {
      id: 'nav.dashboard',
      label: 'Ir al dashboard',
      group: 'Navegación',
      keywords: ['dashboard', 'inicio', 'home'],
      shortcut: ['g', 'd'],
      run: () => router.push('/asesor/dashboard'),
    },
    {
      id: 'nav.marketplace',
      label: 'Ir al marketplace',
      group: 'Navegación',
      keywords: ['marketplace', 'proyectos', 'inventario'],
      shortcut: ['g', 'm'],
      run: () => router.push('/marketplace'),
    },
    {
      id: 'nav.seguridad',
      label: 'Seguridad de la cuenta',
      group: 'Navegación',
      keywords: ['perfil', 'cuenta', '2fa', 'mfa'],
      run: () => router.push('/profile/seguridad'),
    },
    {
      id: 'ai.ask',
      label: 'Preguntar a la IA',
      group: 'IA',
      keywords: ['copilot', 'chat', 'asistente'],
      shortcut: ['⌘', '/'],
      run: () => dispatchBrowserEvent(AI_ASK_EVENT),
    },
    {
      id: 'actions.logout',
      label: 'Cerrar sesión',
      group: 'Acciones',
      keywords: ['logout', 'salir'],
      run: async () => {
        await supabase.auth.signOut();
        router.push('/auth/login');
      },
    },
    {
      id: 'settings.locale.change',
      label: 'Cambiar idioma / región',
      group: 'Ajustes',
      keywords: ['locale', 'idioma', 'país', 'language'],
      run: () => dispatchBrowserEvent(LOCALE_MODAL_EVENT),
    },
    {
      id: 'settings.theme.toggle',
      label: 'Cambiar tema (claro / oscuro)',
      group: 'Ajustes',
      keywords: ['tema', 'dark', 'light', 'theme'],
      run: () => dispatchBrowserEvent(THEME_TOGGLE_EVENT),
    },
  ];
}

export function registerSeedCommands(
  router: Router,
  supabase: SupabaseClient<Database>,
): () => void {
  const cmds = buildSeedCommands(router, supabase);
  const disposers = cmds.map((c) => commandRegistry.register(c));
  return () => {
    for (const d of disposers) d();
  };
}
