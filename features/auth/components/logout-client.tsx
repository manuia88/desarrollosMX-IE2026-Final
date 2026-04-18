'use client';

import { useEffect } from 'react';
import { createClient } from '@/shared/lib/supabase/client';

export function LogoutClient() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.signOut().finally(() => {
      window.location.href = '/auth/login';
    });
  }, []);

  return null;
}
