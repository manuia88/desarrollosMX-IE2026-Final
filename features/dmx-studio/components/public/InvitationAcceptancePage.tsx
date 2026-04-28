'use client';

// F14.F.10 Sprint 9 BIBLIA SUB-AGENT 3 — Public invitation acceptance page.
// Hero: video preview + photographer info + CTA "Ver video y registrarme".
// Onboarding mini si user nuevo. Llama publicProcedure
// trpc.studio.sprint9Photographer.acceptInvitationPublic + getPortfolioBySlug
// (read-only, no auth gate).
//
// i18n migration agendada L-NEW-PHOTOGRAPHER-I18N-KEYS H2 (R8 Sub-agent 3).

import { useCallback, useEffect, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button, Card } from '@/shared/ui/primitives/canon';

export interface InvitationAcceptanceContext {
  readonly photographerBusinessName: string | null;
  readonly photographerSlug: string | null;
  readonly photographerBio: string | null;
  readonly videoStorageUrl: string | null;
  readonly videoThumbnailUrl: string | null;
  readonly invitedEmail: string | null;
  readonly invitedName: string | null;
}

export interface InvitationAcceptancePageProps {
  readonly token: string;
  readonly initialContext: InvitationAcceptanceContext;
  readonly invalid?: boolean;
}

export function InvitationAcceptancePage({
  token,
  initialContext,
  invalid,
}: InvitationAcceptancePageProps) {
  const [accepted, setAccepted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const acceptMutation = trpc.studio.sprint9Photographer.acceptInvitationPublic.useMutation();

  const handleAccept = useCallback(async () => {
    setError(null);
    try {
      await acceptMutation.mutateAsync({ token });
      setAccepted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
    }
  }, [acceptMutation, token]);

  // STUB ADR-018 — Auto-accept on first view defer:
  // L-NEW-PHOTOGRAPHER-INVITE-AUTO-ACCEPT requiere telemetria opened_at via
  // visualización (analytics event). H1 mantiene CTA explícita para evitar
  // race conditions con bots crawler.
  useEffect(() => {
    // intentionally empty — user-initiated acceptance only
  }, []);

  if (invalid) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
        }}
      >
        <Card
          variant="elevated"
          style={{
            maxWidth: '480px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center',
          }}
        >
          <h1
            className="font-[var(--font-display)] text-2xl font-extrabold tracking-tight"
            style={{ color: 'var(--canon-cream)', margin: 0 }}
          >
            Invitación no disponible
          </h1>
          <p style={{ margin: 0, color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
            El enlace puede haber expirado o no es válido. Pídele a tu fotógrafo que te envíe una
            nueva invitación.
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '720px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: 'var(--canon-cream-2)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Invitación de fotógrafo
          </p>
          <h1
            className="font-[var(--font-display)] text-3xl font-extrabold tracking-tight"
            style={{ color: 'var(--canon-cream)', margin: 0 }}
          >
            {initialContext.photographerBusinessName ?? 'Tu fotógrafo'} preparó un video para ti
          </h1>
          {initialContext.photographerBio ? (
            <p
              style={{
                margin: '8px 0 0',
                color: 'var(--canon-cream-2)',
                fontSize: '14px',
                lineHeight: 1.55,
              }}
            >
              {initialContext.photographerBio}
            </p>
          ) : null}
        </header>

        <Card
          variant="elevated"
          style={{
            padding: '0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {initialContext.videoStorageUrl ? (
            <video
              controls
              poster={initialContext.videoThumbnailUrl ?? undefined}
              src={initialContext.videoStorageUrl}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                background: '#000',
              }}
            >
              <track kind="captions" srcLang="es" label="Español" />
            </video>
          ) : (
            <div
              style={{
                aspectRatio: '16 / 9',
                background: 'var(--surface-recessed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--canon-cream-2)',
              }}
            >
              Video no disponible
            </div>
          )}
        </Card>

        <Card
          variant="elevated"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {accepted ? (
            <>
              <h2
                className="font-[var(--font-display)] text-xl font-extrabold tracking-tight"
                style={{ color: 'var(--canon-cream)', margin: 0 }}
              >
                Invitación aceptada
              </h2>
              <p style={{ margin: 0, color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
                Tu fotógrafo recibirá una notificación. Pronto podrás descargar el video con tu
                propia marca.
              </p>
              {initialContext.photographerSlug ? (
                <a
                  href={`/es-MX/studio/foto/${initialContext.photographerSlug}`}
                  style={{
                    color: '#A5B4FC',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Ver portafolio de tu fotógrafo
                </a>
              ) : null}
            </>
          ) : (
            <>
              <h2
                className="font-[var(--font-display)] text-xl font-extrabold tracking-tight"
                style={{ color: 'var(--canon-cream)', margin: 0 }}
              >
                Acepta la invitación para descargar
              </h2>
              <p style={{ margin: 0, color: 'var(--canon-cream-2)', lineHeight: 1.55 }}>
                Crea tu cuenta y descarga el video con tu propia marca. Es gratis registrarte.
              </p>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleAccept}
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? 'Aceptando…' : 'Ver video y registrarme'}
              </Button>

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
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
