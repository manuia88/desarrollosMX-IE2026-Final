'use client';

import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('./command-palette').then((m) => m.CommandPalette), {
  ssr: false,
});

const CommandPaletteBoot = dynamic(
  () => import('./command-palette-boot').then((m) => m.CommandPaletteBoot),
  { ssr: false },
);

const AICopilot = dynamic(() => import('./ai-copilot').then((m) => m.AICopilot), {
  ssr: false,
});

export function GlobalOverlays() {
  return (
    <>
      <CommandPaletteBoot />
      <CommandPalette />
      <AICopilot />
    </>
  );
}
