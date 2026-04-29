'use client';

import { useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';

export function LogoutClient() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.signOut().finally(() => {
      const localeMatch = window.location.pathname.match(/^\/([a-z]{2}-[A-Z]{2})\//);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      window.location.href = `${localePrefix}/auth/login`;
    });
  }, []);

  return null;
}
