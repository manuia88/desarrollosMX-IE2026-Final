import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { defaultLocale, isLocale } from '@/shared/lib/i18n/config';
import { routing } from '@/shared/lib/i18n/routing';
import { applySecurityHeaders, generateNonce } from '@/shared/lib/security/headers';
import { requireEnv } from '@/shared/lib/supabase/env';
import type { Database } from '@/shared/types/database';

const PUBLIC_SUFFIXES = ['', '/', '/auth', '/marketplace'];

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

const intlMiddleware = createIntlMiddleware(routing);

function splitLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first)) {
    return { locale: first, rest: `/${segments.slice(1).join('/')}` };
  }
  return { locale: defaultLocale, rest: pathname };
}

function isPublicPath(rest: string): boolean {
  if (rest === '' || rest === '/') return true;
  return PUBLIC_SUFFIXES.some(
    (prefix) => prefix !== '' && (rest === prefix || rest.startsWith(`${prefix}/`)),
  );
}

function redirectTo(req: NextRequest, locale: string, path: string, from?: string): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${path}`;
  if (from) {
    url.searchParams.set('redirect', from);
  } else {
    url.searchParams.delete('redirect');
  }
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isDev = process.env.NODE_ENV !== 'production';
  const nonce = generateNonce();

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/design-system') ||
    pathname.startsWith('/ie-playground')
  ) {
    const pass = NextResponse.next({ request: req });
    return applySecurityHeaders(pass, nonce, isDev);
  }

  let response = intlMiddleware(req);

  const { locale, rest } = splitLocale(pathname);

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
          const next = NextResponse.next({ request: req });
          response.cookies.getAll().forEach((cookie) => {
            next.cookies.set(cookie.name, cookie.value);
          });
          response.headers.forEach((value, key) => {
            next.headers.set(key, value);
          });
          for (const { name, value, options } of cookiesToSet) {
            next.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            });
          }
          response = next;
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublicPath(rest)) {
    return applySecurityHeaders(response, nonce, isDev);
  }

  if (!user) {
    return redirectTo(req, locale, '/auth/login', pathname);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, is_approved, rol, meta')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    return redirectTo(req, locale, '/auth/logout');
  }

  if (!profile.is_active) {
    return redirectTo(req, locale, '/auth/inactive');
  }

  if (!profile.is_approved && APPROVAL_REQUIRED_ROLES.has(profile.rol)) {
    return redirectTo(req, locale, '/auth/pending-approval');
  }

  if (MFA_REQUIRED_ROLES.has(profile.rol)) {
    const meta = (profile.meta ?? {}) as Record<string, unknown>;
    if (meta.mfa_enabled !== true) {
      return redirectTo(req, locale, '/auth/mfa-enroll');
    }
  }

  return applySecurityHeaders(response, nonce, isDev);
}

export const config = {
  // Incluye /api para que CSP + HSTS + headers de seguridad apliquen también a endpoints.
  // Excluye archivos estáticos para no sumar overhead.
  matcher: [
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)',
  ],
};
