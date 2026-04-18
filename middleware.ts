import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { requireEnv } from '@/shared/lib/supabase/env';
import type { Database } from '@/shared/types/database';

const PUBLIC_PREFIXES = ['/_next', '/favicon.ico', '/auth', '/marketplace', '/api/public'];

const APPROVAL_REQUIRED_ROLES: ReadonlySet<string> = new Set([
  'asesor',
  'admin_desarrolladora',
  'broker_manager',
]);

const MFA_REQUIRED_ROLES: ReadonlySet<string> = new Set([
  'superadmin',
  'admin_desarrolladora',
  'mb_admin',
  'mb_coordinator',
]);

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  let response = NextResponse.next({ request: req });

  const supabase = createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            });
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (pathname.startsWith('/api')) {
    return response;
  }

  if (isPublicPath(pathname)) {
    return response;
  }

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, is_approved, rol, meta')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/logout';
    return NextResponse.redirect(url);
  }

  if (!profile.is_active) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/inactive';
    return NextResponse.redirect(url);
  }

  if (!profile.is_approved && APPROVAL_REQUIRED_ROLES.has(profile.rol)) {
    const url = req.nextUrl.clone();
    url.pathname = '/auth/pending-approval';
    return NextResponse.redirect(url);
  }

  if (MFA_REQUIRED_ROLES.has(profile.rol)) {
    const meta = (profile.meta ?? {}) as Record<string, unknown>;
    if (meta.mfa_enabled !== true) {
      const url = req.nextUrl.clone();
      url.pathname = '/auth/mfa-enroll';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
