'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { trpc } from '@/shared/lib/trpc/client';
import { Button } from '@/shared/ui/primitives/canon';
import { useDevLeads } from '../hooks/use-crm-dev';
import { DevCRMKanban, type DevLeadRow } from './DevCRMKanban';
import { LeadDevDrawer } from './LeadDevDrawer';
import { LeadDevForm } from './LeadDevForm';

export interface CRMDevPageProps {
  readonly locale: string;
}

export function CRMDevPage({ locale }: CRMDevPageProps) {
  const t = useTranslations('dev.crm');
  const leadsQuery = useDevLeads({ limit: 200 });
  const defaultZoneQuery = trpc.crmDev.ensureDefaultZone.useQuery();
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 12,
    borderBottom: '1px solid var(--canon-border)',
    marginBottom: 14,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 22,
    fontWeight: 800,
    color: 'var(--canon-cream)',
    margin: 0,
  };

  const subtitleStyle: CSSProperties = {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: 'var(--canon-cream-2)',
    margin: '2px 0 0',
  };

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  };

  const cardStyle: CSSProperties = {
    background: 'var(--canon-bg-2)',
    border: '1px solid var(--canon-border-2)',
    borderRadius: 'var(--canon-radius-card)',
    padding: 24,
    width: 'min(560px, 92vw)',
    boxShadow: 'var(--shadow-canon-elevated)',
  };

  const leadsForKanban = (leadsQuery.data ?? []) as readonly DevLeadRow[];
  const totalLeads = leadsForKanban.length;
  const hotLeads = leadsForKanban.filter((l) => l.tier === 'hot').length;

  return (
    <main style={{ padding: '24px 28px 80px', minHeight: '100vh' }}>
      <header style={headerStyle}>
        <div>
          <h1 style={titleStyle}>{t('page.title')}</h1>
          <p style={subtitleStyle}>{t('page.subtitle', { total: totalLeads, hot: hotLeads })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/desarrolladores/crm/journeys`}>{t('page.openJourneys')}</Link>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateForm(true)}
            disabled={!defaultZoneQuery.data?.zoneId}
          >
            {t('page.createLead')}
          </Button>
        </div>
      </header>

      {leadsQuery.isLoading ? (
        <p style={{ color: 'var(--canon-cream-3)' }}>{t('page.loading')}</p>
      ) : leadsQuery.error ? (
        <div
          style={{
            padding: 16,
            borderRadius: 'var(--canon-radius-card)',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.30)',
            color: '#fca5a5',
          }}
        >
          {leadsQuery.error.message}
        </div>
      ) : (leadsQuery.data?.length ?? 0) === 0 ? (
        <EmptyState onCreate={() => setShowCreateForm(true)} />
      ) : (
        <DevCRMKanban leads={leadsQuery.data ?? []} onOpenLead={setOpenLeadId} />
      )}

      <LeadDevDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />

      {showCreateForm && defaultZoneQuery.data?.zoneId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('form.title')}
          style={overlayStyle}
          onClick={() => setShowCreateForm(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowCreateForm(false);
          }}
        >
          {/** biome-ignore lint/a11y/noStaticElementInteractions: dialog backdrop pattern */}
          {/** biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only */}
          <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 700,
                margin: '0 0 16px',
                color: 'var(--canon-cream)',
              }}
            >
              {t('form.title')}
            </h2>
            <LeadDevForm
              defaultZoneId={defaultZoneQuery.data.zoneId}
              onCreated={(id) => {
                setShowCreateForm(false);
                setOpenLeadId(id);
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useTranslations('dev.crm.empty');
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        background: 'var(--canon-bg)',
        border: '1px dashed var(--canon-border-2)',
        borderRadius: 'var(--canon-radius-card)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--canon-cream)',
          margin: '0 0 8px',
        }}
      >
        {t('title')}
      </p>
      <p style={{ color: 'var(--canon-cream-2)', fontSize: 13, margin: '0 0 16px' }}>
        {t('description')}
      </p>
      <Button type="button" size="md" onClick={onCreate}>
        {t('cta')}
      </Button>
    </div>
  );
}
