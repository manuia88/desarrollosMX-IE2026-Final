// F14.F.6 Sprint 5 BIBLIA Tarea 5.4 — EDL cut badge color por reason.

export type EdlCutReason = 'filler' | 'silence' | 'bad_take' | 'repetition';

const COLOR_MAP: Record<EdlCutReason, { bg: string; fg: string; label: string }> = {
  filler: { bg: 'rgba(99, 102, 241, 0.15)', fg: '#818CF8', label: 'Muletilla' },
  silence: { bg: 'rgba(245, 158, 11, 0.15)', fg: '#F59E0B', label: 'Silencio' },
  bad_take: { bg: 'rgba(239, 68, 68, 0.15)', fg: '#F87171', label: 'Toma mala' },
  repetition: { bg: 'rgba(244, 63, 94, 0.15)', fg: '#FB7185', label: 'Repetición' },
};

export interface EdlCutBadgeProps {
  readonly reason: EdlCutReason | string;
}

export function EdlCutBadge({ reason }: EdlCutBadgeProps) {
  const config = COLOR_MAP[reason as EdlCutReason] ?? {
    bg: 'rgba(255,255,255,0.10)',
    fg: '#A0A0A0',
    label: reason,
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        background: config.bg,
        color: config.fg,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {config.label}
    </span>
  );
}
