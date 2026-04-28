'use client';

// F14.F.10 Sprint 9 BIBLIA — Photographer Sidebar (simplificada vs asesor full).
// Sin calendar / remarketing / galería personal: Foto plan canon BIBLIA v4 §9.
// 6 entries: Dashboard / Clientes / Crear Video / Invitaciones / Portfolio / Configuración.
// ADR-050 canon: pill nav items, brand gradient SOLO en active state via gradient-ai.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/shared/ui/primitives/canon';

export interface PhotographerSidebarProps {
  readonly locale: string;
}

interface NavEntry {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const containerStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  borderRight: '1px solid var(--canon-border)',
  minHeight: '100%',
};

const linkBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 14px',
  borderRadius: 'var(--canon-radius-pill)',
  fontSize: '13.5px',
  fontWeight: 500,
  color: 'var(--canon-cream-2)',
  textDecoration: 'none',
  transition: 'all 200ms ease',
};

const linkActiveStyle: CSSProperties = {
  ...linkBaseStyle,
  background: 'var(--gradient-ai)',
  color: '#FFFFFF',
  fontWeight: 600,
};

const sectionLabelStyle: CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--canon-cream-2)',
  padding: '0 14px',
  marginBottom: '6px',
  marginTop: '4px',
};

const dashboardIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

const clientsIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const videoIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="m17 10 4-2v8l-4-2" />
  </svg>
);

const inviteIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 4h16v16H4z" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const portfolioIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const settingsIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function PhotographerSidebar({ locale }: PhotographerSidebarProps) {
  const pathname = usePathname() ?? '';

  const entries: ReadonlyArray<NavEntry> = [
    {
      key: 'dashboard',
      href: `/${locale}/studio-app/photographer`,
      label: 'Dashboard',
      icon: dashboardIcon,
    },
    {
      key: 'clients',
      href: `/${locale}/studio-app/photographer/clients`,
      label: 'Clientes',
      icon: clientsIcon,
    },
    {
      key: 'create-video',
      href: `/${locale}/studio-app/projects/new`,
      label: 'Crear Video',
      icon: videoIcon,
    },
    {
      key: 'invitations',
      href: `/${locale}/studio-app/photographer/invitations`,
      label: 'Invitaciones',
      icon: inviteIcon,
    },
    {
      key: 'portfolio',
      href: `/${locale}/studio-app/photographer/portfolio`,
      label: 'Portfolio',
      icon: portfolioIcon,
    },
    {
      key: 'settings',
      href: `/${locale}/studio-app/photographer/settings`,
      label: 'Configuración',
      icon: settingsIcon,
    },
  ];

  return (
    <nav
      aria-label="Photographer navigation"
      className={cn('flex flex-col gap-2 px-3 py-6')}
      style={containerStyle}
      data-testid="photographer-sidebar"
    >
      <p style={sectionLabelStyle}>Studio Foto</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '4px' }}>
        {entries.map((entry) => {
          const isActive =
            pathname === entry.href ||
            (entry.key !== 'dashboard' && pathname.startsWith(entry.href));
          return (
            <li key={entry.key}>
              <Link
                href={entry.href}
                aria-current={isActive ? 'page' : undefined}
                style={isActive ? linkActiveStyle : linkBaseStyle}
                data-testid={`photographer-sidebar-${entry.key}`}
              >
                <span aria-hidden="true">{entry.icon}</span>
                <span>{entry.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
