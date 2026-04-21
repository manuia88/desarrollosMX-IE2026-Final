'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import type { PersonaType } from '../types';
import { PERSONA_TYPES } from '../types';

const PERSONA_ICON: Readonly<Record<PersonaType, string>> = {
  comprador: '◐',
  asesor: '◑',
  developer: '◒',
  masterbroker: '◓',
};

export interface PreviewNavProps {
  readonly activePersona?: PersonaType;
}

export function PreviewNav({ activePersona }: PreviewNavProps) {
  const t = useTranslations('PreviewShared.nav');
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();

  const derivedPersona: PersonaType | undefined = (() => {
    if (activePersona) return activePersona;
    const seg = Array.isArray(params?.persona) ? params.persona[0] : params?.persona;
    if (typeof seg === 'string' && (PERSONA_TYPES as readonly string[]).includes(seg)) {
      return seg as PersonaType;
    }
    const match = pathname?.match(/\/preview\/(comprador|asesor|developer|masterbroker)/);
    return match ? (match[1] as PersonaType) : undefined;
  })();

  return (
    <nav
      aria-label={t('aria_label')}
      style={{
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-surface-elevated)',
        padding: 'var(--space-3, 0.75rem) var(--space-6, 1.5rem)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4, 1rem)',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 'var(--space-2, 0.5rem)', alignItems: 'center' }}>
          <Link
            href={`/${locale}/preview`}
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            {t('breadcrumb_preview')}
          </Link>
          {derivedPersona ? (
            <>
              <span aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }}>
                {'·'}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {t(`persona.${derivedPersona}`)}
              </span>
            </>
          ) : null}
        </div>

        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2, 0.5rem)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {PERSONA_TYPES.map((persona) => {
            const active = persona === derivedPersona;
            return (
              <li key={persona}>
                <Link
                  href={`/${locale}/preview/${persona}`}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-2, 0.5rem)',
                    padding: 'var(--space-2, 0.5rem) var(--space-3, 0.75rem)',
                    borderRadius: 'var(--radius-md, 0.5rem)',
                    background: active ? 'var(--color-accent-soft)' : 'transparent',
                    color: active ? 'var(--color-accent-strong)' : 'var(--color-text-secondary)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: active
                      ? 'var(--font-weight-semibold, 600)'
                      : 'var(--font-weight-regular, 400)',
                    textDecoration: 'none',
                    border: `1px solid ${active ? 'var(--color-accent-border)' : 'var(--color-border-subtle)'}`,
                  }}
                >
                  <span aria-hidden="true">{PERSONA_ICON[persona]}</span>
                  <span>{t(`persona.${persona}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href={`/${locale}/dashboard`}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-semibold, 600)',
            color: 'var(--color-accent-strong)',
            textDecoration: 'none',
          }}
        >
          {t('go_to_platform')}
        </Link>
      </div>
    </nav>
  );
}
