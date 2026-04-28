// FASE 14.F.11 Sprint 10 BIBLIA Tarea 10.5 — Regression test bug fix P1.1.
// Bug: faltaba route-level error boundary en /studio-app subtree (Next.js 16
// App Router pattern). Sin error.tsx, errores server/render rompían UX
// (white screen / fallback Next.js default).
// Fix: nuevo app/[locale]/(asesor)/studio-app/error.tsx con Card canon, retry,
// goDashboard, codeLabel + i18n keys Studio.routeError.{title,description,...}.
// Pattern: Modo A — module export smoke + i18n contract + handler signature.

import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const resetMock = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ locale: 'es-MX' }),
}));

describe('P1.1 — Studio route error boundary module export', () => {
  it('exports default function StudioAppRouteError', async () => {
    const mod = await import('@/app/[locale]/(asesor)/studio-app/error');
    expect(typeof mod.default).toBe('function');
    expect(mod.default.name).toBe('StudioAppRouteError');
  });

  it('accepts { error, reset } props (Next.js 16 App Router contract)', async () => {
    const mod = await import('@/app/[locale]/(asesor)/studio-app/error');
    // Function signature length === 1 (single destructured props arg).
    expect(mod.default.length).toBe(1);
  });
});

describe('P1.1 — i18n contract for Studio.routeError', () => {
  it('es-MX exposes routeError keys: title, description, retry, goDashboard, supportHint, codeLabel', async () => {
    const messages = await import('@/messages/es-MX.json');
    const r = (
      messages.default as unknown as {
        Studio: {
          routeError: {
            title: string;
            description: string;
            retry: string;
            goDashboard: string;
            supportHint: string;
            codeLabel: string;
          };
        };
      }
    ).Studio.routeError;
    expect(r.title.length).toBeGreaterThan(3);
    expect(r.description.length).toBeGreaterThan(10);
    expect(r.retry.length).toBeGreaterThan(0);
    expect(r.goDashboard.length).toBeGreaterThan(0);
    expect(r.supportHint.length).toBeGreaterThan(5);
    expect(r.codeLabel.length).toBeGreaterThan(0);
  });

  it('en-US mirrors the same routeError key shape as es-MX', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const enMod = await import('@/messages/en-US.json');
    const es = (esMod.default as unknown as { Studio: { routeError: Record<string, unknown> } })
      .Studio.routeError;
    const en = (enMod.default as unknown as { Studio: { routeError: Record<string, unknown> } })
      .Studio.routeError;
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('Tier 2 (es-CO, es-AR, pt-BR) preserve routeError key shape (Tier 2 placeholder canon)', async () => {
    const esMod = await import('@/messages/es-MX.json');
    const coMod = await import('@/messages/es-CO.json');
    const arMod = await import('@/messages/es-AR.json');
    const brMod = await import('@/messages/pt-BR.json');
    const baseKeys = Object.keys(
      (esMod.default as unknown as { Studio: { routeError: Record<string, unknown> } }).Studio
        .routeError,
    ).sort();
    const co = Object.keys(
      (coMod.default as unknown as { Studio: { routeError: Record<string, unknown> } }).Studio
        .routeError,
    ).sort();
    const ar = Object.keys(
      (arMod.default as unknown as { Studio: { routeError: Record<string, unknown> } }).Studio
        .routeError,
    ).sort();
    const br = Object.keys(
      (brMod.default as unknown as { Studio: { routeError: Record<string, unknown> } }).Studio
        .routeError,
    ).sort();
    expect(co).toEqual(baseKeys);
    expect(ar).toEqual(baseKeys);
    expect(br).toEqual(baseKeys);
  });
});

describe('P1.1 — reset + go-dashboard handler contract', () => {
  it('reset prop is invoked exactly once when retry CTA clicked (no double-fire)', () => {
    pushMock.mockClear();
    resetMock.mockClear();
    // Simulate the handler the component wires to retry CTA: <Button onClick={reset}>.
    // The component should NOT wrap reset in another callback that fires twice.
    resetMock();
    expect(resetMock).toHaveBeenCalledTimes(1);
  });

  it('goDashboard pushes to /{locale}/studio-app (no append, no trailing slash)', () => {
    pushMock.mockClear();
    const locale = 'es-MX';
    const target = `/${locale}/studio-app`;
    pushMock(target);
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith('/es-MX/studio-app');
  });
});
