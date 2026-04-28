import type { ReactNode } from 'react';
import { DevHeader, type DevHeaderUser } from '@/features/dev-shell/components/DevHeader';
import { DevSidebar } from '@/features/dev-shell/components/DevSidebar';
import { AICopilot } from '@/shared/ui/layout/ai-copilot';
import { AmbientBackground } from '@/shared/ui/motion/ambient-background';

export interface DevShellProps {
  readonly user: DevHeaderUser;
  readonly companyName: string | null;
  readonly locale: string;
  readonly unreadCount?: number;
  readonly children: ReactNode;
}

export function DevShell({ user, companyName, locale, unreadCount = 0, children }: DevShellProps) {
  return (
    <div
      data-theme="canon-dark"
      className="relative min-h-screen"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <AmbientBackground coverage="page" intensity="subtle" />
      <DevSidebar locale={locale} />
      <DevHeader user={user} companyName={companyName} unreadCount={unreadCount} />
      <main id="dev-content" className="ml-[60px] min-h-screen pt-[72px]">
        <div className="mx-auto w-full max-w-[1440px] px-6 py-6 lg:px-10">{children}</div>
      </main>
      <AICopilot />
    </div>
  );
}
