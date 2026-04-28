'use client';

// F14.F.10 Sprint 9 BIBLIA — Photographer Dashboard simplificado.
// Sin calendar/remarketing/galería personal: BIBLIA v4 §9 Plan Foto canon.
// Stats: clients_count, videos_generated, revenue_est, rating_avg.
// CTA crear video + recent videos + bulk processing entry + invitations sent count.
// ADR-050 canon: Card elevated/spotlight, big numbers Outfit 800 + tabular-nums,
// gradient AI tone para bulk processing scarcity signal, motion ≤ 850ms.

import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { FadeUp } from '@/shared/ui/motion';
import { Button, Card, IconCircle } from '@/shared/ui/primitives/canon';

export interface PhotographerDashboardProps {
  readonly locale: string;
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  letterSpacing: '-0.015em',
  color: '#FFFFFF',
};

const subtitleStyle: CSSProperties = {
  color: 'var(--canon-cream-2)',
  fontSize: '14px',
  lineHeight: 1.55,
};

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: '20px',
  letterSpacing: '-0.01em',
  color: '#FFFFFF',
};

const skeletonStyle: CSSProperties = {
  background: 'var(--surface-recessed)',
  border: '1px solid var(--canon-border)',
  borderRadius: 'var(--canon-radius-card)',
  height: '120px',
};

const statValueStyle: CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '32px',
  lineHeight: 1.05,
  letterSpacing: '-0.01em',
  fontVariantNumeric: 'tabular-nums',
  color: '#FFFFFF',
};

const statLabelStyle: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--canon-cream-2)',
};

const statHintStyle: CSSProperties = {
  fontSize: '12.5px',
  color: 'var(--canon-cream-2)',
};

const usersIcon = (
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

const dollarIcon = (
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
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 5H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7" />
  </svg>
);

const starIcon = (
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
    <path d="m12 3 2.6 5.6 6 .6-4.5 4 1.3 5.9L12 16.9l-5.5 2.2 1.3-5.9-4.5-4 6-.6Z" />
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

const layersIcon = (
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
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

interface StatCardProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly icon: ReactNode;
  readonly variant?: 'elevated' | 'spotlight';
  readonly testId?: string;
}

function StatCard({ label, value, hint, icon, variant = 'elevated', testId }: StatCardProps) {
  return (
    <Card
      variant={variant}
      className="flex flex-col gap-3 p-6"
      role="group"
      aria-label={label}
      data-testid={testId}
    >
      <div className="flex items-center justify-between gap-3">
        <span style={statLabelStyle}>{label}</span>
        <span aria-hidden="true">{icon}</span>
      </div>
      <span style={statValueStyle}>{value}</span>
      {hint ? <span style={statHintStyle}>{hint}</span> : null}
    </Card>
  );
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRating(n: number | null): string {
  if (n === null || Number.isNaN(n)) return '—';
  return n.toFixed(1);
}

export function PhotographerDashboard({ locale }: PhotographerDashboardProps) {
  const router = useRouter();
  const profileQuery = trpc.studio.sprint9Photographer.getProfile.useQuery();
  const clientsQuery = trpc.studio.sprint9Photographer.listClients.useQuery();
  const invitesQuery = trpc.studio.sprint9Photographer.listInvites.useQuery();
  const recentVideosQuery = trpc.studio.dashboard.getRecentVideos.useQuery();

  const profile = profileQuery.data;
  const clients = clientsQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const recentVideos = recentVideosQuery.data ?? [];

  const isLoading = profileQuery.isLoading;

  const clientsCount = profile?.clients_count ?? clients.length;
  const videosGenerated = profile?.videos_generated_total ?? 0;
  const revenueEst = Number(profile?.revenue_est_total ?? 0);
  const ratingAvg =
    profile?.rating_avg !== null && profile?.rating_avg !== undefined
      ? Number(profile.rating_avg)
      : null;
  const invitesSent = invites.length;
  const businessName = profile?.business_name ?? 'Estudio';

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FadeUp delay={0}>
          <div className="flex flex-col gap-2">
            <h1 style={headingStyle}>{businessName}</h1>
            <p style={subtitleStyle}>Tu estudio fotográfico — DMX Studio Foto</p>
          </div>
        </FadeUp>
        <FadeUp delay={0.1}>
          <Button
            variant="primary"
            size="lg"
            type="button"
            data-testid="photographer-create-video-cta"
            aria-label="Crear nuevo video"
            onClick={() => router.push(`/${locale}/studio-app/projects/new`)}
          >
            Crear Video
          </Button>
        </FadeUp>
      </header>

      <FadeUp delay={0.15}>
        <section
          aria-label="Estadísticas del estudio"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="photographer-stats-grid"
        >
          {isLoading ? (
            <>
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
              <div aria-hidden="true" style={skeletonStyle} />
            </>
          ) : (
            <>
              <StatCard
                label="Clientes"
                value={String(clientsCount)}
                hint="Activos en tu cartera"
                icon={<IconCircle tone="teal" size="sm" icon={usersIcon} />}
                testId="photographer-stat-clients"
              />
              <StatCard
                label="Videos generados"
                value={String(videosGenerated)}
                hint="Total acumulado"
                icon={<IconCircle tone="indigo" size="sm" icon={videoIcon} />}
                testId="photographer-stat-videos"
              />
              <StatCard
                label="Ingresos estimados"
                value={formatUsd(revenueEst)}
                hint="USD acumulado"
                icon={<IconCircle tone="violet" size="sm" icon={dollarIcon} />}
                testId="photographer-stat-revenue"
              />
              <StatCard
                label="Rating promedio"
                value={formatRating(ratingAvg)}
                hint="Sobre 5 estrellas"
                icon={<IconCircle tone="gold" size="sm" icon={starIcon} />}
                testId="photographer-stat-rating"
              />
            </>
          )}
        </section>
      </FadeUp>

      <FadeUp delay={0.25}>
        <section aria-label="Acciones rápidas" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card variant="spotlight" className="flex flex-col gap-3 p-6">
            <div className="flex items-center gap-3">
              <IconCircle tone="violet" size="md" icon={layersIcon} />
              <h3 style={sectionTitleStyle}>Procesamiento masivo</h3>
            </div>
            <p style={subtitleStyle}>
              Procesa hasta 20 videos de clientes en un solo batch. Ideal para shootings múltiples.
            </p>
            <div className="mt-1">
              <Button
                variant="glass"
                size="md"
                type="button"
                data-testid="photographer-bulk-cta"
                onClick={() => router.push(`/${locale}/studio-app/photographer/bulk`)}
              >
                Iniciar batch
              </Button>
            </div>
          </Card>

          <Card variant="elevated" className="flex flex-col gap-3 p-6">
            <div className="flex items-center gap-3">
              <IconCircle tone="indigo" size="md" icon={inviteIcon} />
              <h3 style={sectionTitleStyle}>Invitaciones</h3>
            </div>
            <p style={subtitleStyle}>
              {invitesSent} invitaciones enviadas. Cada cliente que se suscribe a Studio Pro te
              genera comisión recurrente.
            </p>
            <div className="mt-1">
              <Button
                variant="glass"
                size="md"
                type="button"
                data-testid="photographer-invitations-cta"
                onClick={() => router.push(`/${locale}/studio-app/photographer/invitations`)}
              >
                Ver invitaciones
              </Button>
            </div>
          </Card>
        </section>
      </FadeUp>

      <FadeUp delay={0.35}>
        <section
          aria-label="Videos recientes"
          className="flex flex-col gap-4"
          data-testid="photographer-recent-videos"
        >
          <header className="flex items-center justify-between">
            <h2 style={sectionTitleStyle}>Videos recientes</h2>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => router.push(`/${locale}/studio-app/library`)}
            >
              Ver todos
            </Button>
          </header>

          {recentVideosQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div aria-hidden="true" style={{ ...skeletonStyle, height: '160px' }} />
              <div aria-hidden="true" style={{ ...skeletonStyle, height: '160px' }} />
              <div aria-hidden="true" style={{ ...skeletonStyle, height: '160px' }} />
            </div>
          ) : recentVideos.length === 0 ? (
            <Card variant="recessed" className="flex flex-col items-start gap-3 p-8">
              <p style={subtitleStyle}>
                Aún no has creado videos. Empieza con tu primer video — solo necesitas fotos de un
                proyecto.
              </p>
              <Button
                variant="primary"
                size="md"
                type="button"
                onClick={() => router.push(`/${locale}/studio-app/projects/new`)}
              >
                Crear primer video
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentVideos.slice(0, 6).map((video) => (
                <Card
                  key={video.id}
                  variant="elevated"
                  hoverable
                  className="flex flex-col gap-2 p-5"
                >
                  <h4
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '14.5px',
                      color: '#FFFFFF',
                      lineHeight: 1.3,
                    }}
                  >
                    {video.title ?? 'Sin título'}
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--canon-cream-2)' }}>
                    {video.status} · {video.projectType}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </section>
      </FadeUp>
    </div>
  );
}
