'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import {
  type CopilotDrawerKey,
  useCopilotDrawer,
} from '@/features/asesor-shell/hooks/use-copilot-drawer';
import {
  IconAudioLines,
  IconHelpCircle,
  IconMic,
  IconSparkles,
  IconVolume2,
  IconX,
} from '@/shared/ui/icons/canon-icons';
import { DisclosurePill } from '@/shared/ui/primitives/canon/disclosure-pill';

const RAIL_BUTTONS: { id: CopilotDrawerKey; Icon: typeof IconMic; key: string }[] = [
  { id: 'voice', Icon: IconMic, key: 'copilot.voice' },
  { id: 'copilot', Icon: IconSparkles, key: 'copilot.copilot' },
  { id: 'briefing', Icon: IconVolume2, key: 'copilot.briefing' },
  { id: 'vibe', Icon: IconAudioLines, key: 'copilot.vibe' },
  { id: 'help', Icon: IconHelpCircle, key: 'copilot.help' },
];

export function CopilotRail() {
  const t = useTranslations('AsesorShell');
  const drawer = useCopilotDrawer();

  const railStyle: CSSProperties = {
    background: 'var(--surface-recessed)',
    borderLeft: '1px solid var(--canon-border)',
  };

  return (
    <>
      <nav
        aria-label={t('copilot.railAria')}
        className="fixed bottom-0 right-0 top-[72px] z-40 flex w-[55px] flex-col items-center gap-2 py-3"
        style={railStyle}
      >
        {RAIL_BUTTONS.map(({ id, Icon, key }) => {
          const isActive = drawer.active === id;
          return (
            <button
              key={id}
              type="button"
              aria-label={t(`${key}.aria`)}
              aria-pressed={isActive}
              onClick={() => drawer.toggle(id)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-violet)]"
              style={{
                background: isActive
                  ? 'color-mix(in oklab, var(--accent-violet) 18%, transparent)'
                  : 'rgba(255,255,255,0.04)',
                borderColor: isActive ? 'var(--accent-violet)' : 'rgba(255,255,255,0.08)',
                color: isActive ? '#e9d5ff' : 'var(--canon-cream)',
                boxShadow: isActive ? '0 0 24px rgba(168,85,247,0.32)' : 'none',
              }}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </nav>
      {drawer.active ? <CopilotDrawerPanel active={drawer.active} onClose={drawer.close} /> : null}
    </>
  );
}

function CopilotDrawerPanel({
  active,
  onClose,
}: {
  active: CopilotDrawerKey;
  onClose: () => void;
}) {
  const t = useTranslations('AsesorShell');
  const titleKey = `copilot.${active}.title` as const;
  const stubKey = `copilot.${active}.stub` as const;

  const drawerStyle: CSSProperties = {
    background: 'var(--surface-elevated)',
    borderLeft: '1px solid var(--canon-border-2)',
    color: 'var(--canon-cream)',
    boxShadow: 'var(--shadow-canon-spotlight)',
  };

  return (
    <aside
      aria-label={t(titleKey)}
      className="fixed bottom-0 right-[55px] top-[72px] z-[60] w-[420px] max-w-[calc(100vw-55px)] flex-col p-5"
      style={drawerStyle}
    >
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {t(titleKey)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('copilot.close')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-[color:rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--canon-indigo)]"
          style={{ borderColor: 'var(--canon-border)' }}
        >
          <IconX size={16} />
        </button>
      </header>
      <DisclosurePill tone="violet">{t('disclosure.synthetic')}</DisclosurePill>
      <p
        className="mt-4 text-[13px] leading-relaxed text-[var(--canon-cream-2)]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {t(stubKey)}
      </p>
    </aside>
  );
}
