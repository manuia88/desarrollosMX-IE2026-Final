'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  registerSeedCommands,
  THEME_TOGGLE_EVENT,
} from '@/shared/lib/command-palette/seed-commands';
import { createClient } from '@/shared/lib/supabase/client';

export function CommandPaletteBoot() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const cleanup = registerSeedCommands(router, supabase);

    const onThemeToggle = () => {
      const root = document.documentElement;
      const isDark = root.classList.toggle('dark');
      try {
        localStorage.setItem('dmx.theme', isDark ? 'dark' : 'light');
      } catch {}
    };
    window.addEventListener(THEME_TOGGLE_EVENT, onThemeToggle);

    return () => {
      cleanup();
      window.removeEventListener(THEME_TOGGLE_EVENT, onThemeToggle);
    };
  }, [router]);

  return null;
}
