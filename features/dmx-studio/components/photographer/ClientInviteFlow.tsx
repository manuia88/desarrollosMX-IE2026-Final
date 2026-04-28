'use client';

// F14.F.10 Sprint 9 BIBLIA SUB-AGENT 3 — Client invite flow per video.
// Form invita cliente (nombre + email), preview del email, lista invitations
// recientes con status. Usa trpc.studio.sprint9Photographer.sendInvite +
// listInvites. ADR-050 canon: pill buttons, brand gradient, glass surfaces.
//
// i18n migration agendada L-NEW-PHOTOGRAPHER-I18N-KEYS H2 (R8 Sub-agent 3).

import { useCallback, useId, useMemo, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ClientInviteFlowProps {
  readonly videoId: string;
  readonly videoLabel?: string | null;
  readonly disabled?: boolean;
}

interface InviteListItem {
  readonly id: string;
  readonly invited_email: string;
  readonly invited_name: string | null;
  readonly invitation_type: string;
  readonly status: string;
  readonly sent_at: string;
  readonly accepted_at: string | null;
  readonly related_video_id: string | null;
}

function formatStatus(status: string): string {
  if (status === 'sent') return 'Enviado';
  if (status === 'opened') return 'Visto';
  if (status === 'accepted') return 'Aceptado';
  if (status === 'expired') return 'Expirado';
  return status;
}

function statusColor(status: string): { bg: string; fg: string } {
  if (status === 'accepted') return { bg: 'rgba(16,185,129,0.16)', fg: '#6EE7B7' };
  if (status === 'opened') return { bg: 'rgba(99,102,241,0.16)', fg: '#A5B4FC' };
  if (status === 'expired') return { bg: 'rgba(244,63,94,0.14)', fg: '#FCA5A5' };
  return { bg: 'rgba(255,255,255,0.06)', fg: 'var(--canon-cream-2)' };
}

export function ClientInviteFlow({ videoId, videoLabel, disabled }: ClientInviteFlowProps) {
  const emailId = useId();
  const nameId = useId();
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const sendInvite = trpc.studio.sprint9Photographer.sendInvite.useMutation();
  const utils = trpc.useUtils();
  const listInvites = trpc.studio.sprint9Photographer.listInvites.useQuery();

  const filtered = useMemo<ReadonlyArray<InviteListItem>>(() => {
    const all = (listInvites.data ?? []) as ReadonlyArray<InviteListItem>;
    return all.filter((inv) => inv.related_video_id === videoId);
  }, [listInvites.data, videoId]);

  const canSubmit = !disabled && !sendInvite.isPending && EMAIL_RE.test(email);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      if (!EMAIL_RE.test(email)) {
        setError('Email inválido');
        return;
      }
      try {
        await sendInvite.mutateAsync({
          email,
          name: name.trim().length > 0 ? name.trim() : undefined,
          videoId,
          invitationType: 'client_invite',
        });
        setEmail('');
        setName('');
        await utils.studio.sprint9Photographer.listInvites.invalidate();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        setError(message);
      }
    },
    [email, name, sendInvite, utils, videoId],
  );

  return (
    <Card
      variant="elevated"
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3
          className="font-[var(--font-display)] text-xl font-extrabold tracking-tight"
          style={{ color: 'var(--canon-cream)', margin: 0 }}
        >
          Invitar cliente al video
        </h3>
        {videoLabel ? (
          <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: '13px' }}>{videoLabel}</p>
        ) : null}
      </header>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor={nameId}
            style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--canon-cream-2)' }}
          >
            Nombre (opcional)
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled || sendInvite.isPending}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-chip)',
              color: 'var(--canon-cream)',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            htmlFor={emailId}
            style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--canon-cream-2)' }}
          >
            Email
          </label>
          <input
            id={emailId}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled || sendInvite.isPending}
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--surface-recessed)',
              border: '1px solid var(--canon-border)',
              borderRadius: 'var(--canon-radius-chip)',
              color: 'var(--canon-cream)',
              fontSize: '14px',
            }}
          />
        </div>

        <details
          style={{
            background: 'var(--surface-recessed)',
            border: '1px solid var(--canon-border)',
            borderRadius: 'var(--canon-radius-chip)',
            padding: '8px 12px',
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--canon-cream-2)',
              fontWeight: 600,
            }}
          >
            Vista previa del correo
          </summary>
          <div
            style={{
              marginTop: '10px',
              padding: '12px',
              background: '#FFFFFF',
              borderRadius: 'var(--canon-radius-chip)',
              color: '#0F172A',
              fontSize: '13px',
              lineHeight: 1.55,
            }}
          >
            <strong>Asunto:</strong> Tu video inmobiliario está listo
            <br />
            Hola {name.trim() || '[cliente]'}, tu fotógrafo preparó un video profesional. Recibirás
            un botón "Ver video y descargar".
          </div>
        </details>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="primary" size="md" disabled={!canSubmit}>
            {sendInvite.isPending ? 'Enviando…' : 'Enviar invitación'}
          </Button>
        </div>

        {error ? (
          <div
            role="alert"
            style={{
              padding: '10px 12px',
              background: 'rgba(244,63,94,0.10)',
              border: '1px solid rgba(244,63,94,0.30)',
              borderRadius: 'var(--canon-radius-chip)',
              color: '#FCA5A5',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        ) : null}
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            fontSize: '12.5px',
            fontWeight: 600,
            color: 'var(--canon-cream-2)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Invitaciones del video
        </div>
        {listInvites.isLoading ? (
          <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: '13px' }}>Cargando…</p>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--canon-cream-2)', fontSize: '13px' }}>
            Aún no has enviado invitaciones para este video.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {filtered.map((inv) => {
              const colors = statusColor(inv.status);
              return (
                <li
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                    background: 'var(--surface-recessed)',
                    border: '1px solid var(--canon-border)',
                    borderRadius: 'var(--canon-radius-chip)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span
                      style={{
                        color: 'var(--canon-cream)',
                        fontSize: '13.5px',
                        fontWeight: 600,
                      }}
                    >
                      {inv.invited_name ?? inv.invited_email}
                    </span>
                    <span style={{ color: 'var(--canon-cream-2)', fontSize: '12px' }}>
                      {inv.invited_email}
                    </span>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--canon-radius-pill)',
                      background: colors.bg,
                      color: colors.fg,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {formatStatus(inv.status)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
