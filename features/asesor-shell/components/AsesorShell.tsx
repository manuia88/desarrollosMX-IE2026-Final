'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { AsesorSidebar } from '@/features/asesor-shell/components/AsesorSidebar';
import {
  AsesorTopbar,
  type AvailabilityStatus,
  type ShellUser,
} from '@/features/asesor-shell/components/AsesorTopbar';
import { CommandPalette } from '@/features/asesor-shell/components/CommandPalette';
import { CopilotRail } from '@/features/asesor-shell/components/CopilotRail';
import {
  type QuickActionId,
  QuickActionsFloater,
} from '@/features/asesor-shell/components/QuickActionsFloater';
import { buildBreadcrumb, getActiveModuleId } from '@/features/asesor-shell/lib/active-module';

export type { AvailabilityStatus, QuickActionId, ShellUser };

interface AsesorShellProps {
  user: ShellUser;
  locale: string;
  unreadCount?: number;
  onQuickAction?: (action: QuickActionId) => void;
  children: React.ReactNode;
}

export function AsesorShell({
  user,
  locale,
  unreadCount = 0,
  onQuickAction,
  children,
}: AsesorShellProps) {
  const pathname = usePathname() ?? '';
  const activeModuleId = useMemo(() => getActiveModuleId(pathname, locale), [pathname, locale]);
  const breadcrumb = useMemo(() => buildBreadcrumb(pathname, locale), [pathname, locale]);

  const handleAction = (action: QuickActionId) => {
    onQuickAction?.(action);
  };

  return (
    <div
      data-theme="canon-dark"
      className="min-h-screen"
      style={{
        background: 'var(--canon-bg)',
        color: 'var(--canon-cream)',
      }}
    >
      <AsesorSidebar activeModuleId={activeModuleId} locale={locale} />
      <AsesorTopbar user={user} breadcrumb={breadcrumb} unreadCount={unreadCount} />
      <CopilotRail />
      <main id="asesor-content" className="ml-[60px] mr-[55px] min-h-screen pt-[72px]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-6 lg:px-10">{children}</div>
      </main>
      <QuickActionsFloater onAction={handleAction} />
      <CommandPalette locale={locale} onAction={handleAction} />
    </div>
  );
}
