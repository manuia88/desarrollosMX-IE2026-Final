'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useState } from 'react';
import { Button } from '@/shared/ui/primitives/canon';
import {
  useDevLeadScore,
  useDevLeadTimeline,
  useInvalidateCrmDevQueries,
  useRecomputeLeadScore,
} from '../hooks/use-crm-dev';
import { AssignAsesorDialog } from './AssignAsesorDialog';
import { LeadScoreBadge } from './LeadScoreBadge';

export interface LeadDevDrawerProps {
  readonly leadId: string | null;
  readonly onClose: () => void;
}

type Tab = 'timeline' | 'score' | 'inbox' | 'tareas';

export function LeadDevDrawer({ leadId, onClose }: LeadDevDrawerProps) {
  const t = useTranslations('dev.crm.drawer');
  const [tab, setTab] = useState<Tab>('timeline');
  const [showAssign, setShowAssign] = useState(false);
  const timeline = useDevLeadTimeline(leadId);
  const score = useDevLeadScore(leadId);
  const recompute = useRecomputeLeadScore();
  const invalidate = useInvalidateCrmDevQueries();

  if (!leadId) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    zIndex: 40,
  };

  const drawerStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(560px, 92vw)',
    background: 'var(--canon-bg-2)',
    borderLeft: '1px solid var(--canon-border-2)',
    boxShadow: 'var(--shadow-canon-elevated)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 41,
  };

  const headerStyle: CSSProperties = {
    padding: 18,
    borderBottom: '1px solid var(--canon-border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  };

  const tabsStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    padding: '8px 18px 0',
    borderBottom: '1px solid var(--canon-border)',
  };

  const tabBtnStyle = (active: boolean): CSSProperties => ({
    padding: '8px 14px',
    borderRadius: 'var(--canon-radius-pill) var(--canon-radius-pill) 0 0',
    border: 'none',
    background: active ? 'var(--canon-bg)' : 'transparent',
    color: active ? 'var(--canon-cream)' : 'var(--canon-cream-2)',
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  });

  const lead = timeline.data?.lead;
  const tier = score.data?.tier ?? null;
  const factors = score.data?.factors as
    | { engagement?: number; intent?: number; demographics?: number; recency?: number }
    | undefined;
  const factorScore = score.data?.score ?? null;

  return (
    <>
      <button
        type="button"
        aria-label={t('closeAria')}
        onClick={onClose}
        style={{ ...overlayStyle, border: 0, padding: 0, cursor: 'pointer' }}
      />
      <aside role="dialog" aria-label={t('title')} style={drawerStyle}>
        <header style={headerStyle}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 800,
                  margin: 0,
                  color: 'var(--canon-cream)',
                }}
              >
                {lead?.contact_name ?? t('loading')}
              </h2>
              <p
                style={{
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  color: 'var(--canon-cream-2)',
                }}
              >
                {lead?.contact_email ?? lead?.contact_phone ?? '—'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('closeAria')}>
              ✕
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <LeadScoreBadge score={factorScore} tier={tier} factors={factors ?? null} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                await recompute.mutateAsync({ leadId });
                invalidate.invalidateLead(leadId);
              }}
              disabled={recompute.isPending}
            >
              {recompute.isPending ? t('actions.recomputing') : t('actions.recompute')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAssign(true)}>
              {t('actions.assignAsesor')}
            </Button>
          </div>
        </header>

        <nav style={tabsStyle} aria-label={t('tabs.aria')}>
          {(['timeline', 'score', 'inbox', 'tareas'] as const).map((id) => (
            <button
              type="button"
              key={id}
              onClick={() => setTab(id)}
              style={tabBtnStyle(tab === id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              {t(`tabs.${id}`)}
            </button>
          ))}
        </nav>

        <div style={{ overflow: 'auto', padding: 18, flex: 1 }}>
          {tab === 'timeline' ? (
            <TimelineSection
              events={timeline.data?.events ?? []}
              isPartial={timeline.data?.isPartial ?? false}
              missingSources={timeline.data?.missingSources ?? []}
              loading={timeline.isLoading}
            />
          ) : null}
          {tab === 'score' ? (
            <ScoreSection
              score={factorScore}
              tier={tier}
              factors={factors ?? null}
              modelVersion={score.data?.modelVersion ?? null}
              computedAt={score.data?.computedAt ?? null}
            />
          ) : null}
          {tab === 'inbox' ? <InboxSectionStub /> : null}
          {tab === 'tareas' ? <TareasSectionStub /> : null}
        </div>
      </aside>
      {showAssign ? (
        <AssignAsesorDialog
          leadId={leadId}
          currentAsesorId={lead?.assigned_asesor_id ?? null}
          onClose={() => setShowAssign(false)}
        />
      ) : null}
    </>
  );
}

interface TimelineEvent {
  type: string;
  at: string;
  payload: unknown;
}

function TimelineSection({
  events,
  isPartial,
  missingSources,
  loading,
}: {
  events: readonly TimelineEvent[];
  isPartial: boolean;
  missingSources: readonly string[];
  loading: boolean;
}) {
  const t = useTranslations('dev.crm.drawer.timeline');
  if (loading) {
    return <p style={{ color: 'var(--canon-cream-3)' }}>{t('loading')}</p>;
  }
  return (
    <div>
      {isPartial ? (
        <div
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.30)',
            borderRadius: 'var(--canon-radius-card)',
            padding: 10,
            marginBottom: 12,
            fontSize: 11,
            color: '#fcd34d',
            fontFamily: 'var(--font-body)',
          }}
        >
          {t('partialNotice', { sources: missingSources.join(', ') })}
        </div>
      ) : null}
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {events.length === 0 ? (
          <li style={{ color: 'var(--canon-cream-3)', fontSize: 12 }}>{t('empty')}</li>
        ) : null}
        {events.map((e, idx) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: rebuilt per query, type+at+idx tail guards duplicates
            key={`${e.type}-${e.at}-${idx}`}
            style={{
              padding: 10,
              borderRadius: 'var(--canon-radius-card)',
              background: 'var(--canon-bg)',
              border: '1px solid var(--canon-border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--canon-cream)',
                marginBottom: 4,
              }}
            >
              <span>{t(`type.${e.type}`)}</span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 400,
                  color: 'var(--canon-cream-3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {new Date(e.at).toLocaleString()}
              </span>
            </div>
            <pre
              style={{
                margin: 0,
                fontFamily: 'ui-monospace',
                fontSize: 11,
                color: 'var(--canon-cream-2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(e.payload, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreSection({
  score,
  tier,
  factors,
  modelVersion,
  computedAt,
}: {
  score: number | null;
  tier: 'hot' | 'warm' | 'cold' | null;
  factors: { engagement?: number; intent?: number; demographics?: number; recency?: number } | null;
  modelVersion: string | null;
  computedAt: string | null;
}) {
  const t = useTranslations('dev.crm.drawer.score');
  if (score == null) {
    return <p style={{ color: 'var(--canon-cream-3)' }}>{t('empty')}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            fontWeight: 800,
            color: 'var(--canon-cream)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {score}
        </span>
        <div>
          <LeadScoreBadge score={score} tier={tier} />
          <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--canon-cream-3)' }}>
            {t('model', { version: modelVersion ?? '—' })}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--canon-cream-3)' }}>
            {computedAt ? t('computedAt', { date: new Date(computedAt).toLocaleString() }) : ''}
          </p>
        </div>
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {(['engagement', 'intent', 'demographics', 'recency'] as const).map((f) => (
          <li
            key={f}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 'var(--canon-radius-card)',
              background: 'var(--canon-bg)',
              border: '1px solid var(--canon-border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--canon-cream-2)',
              }}
            >
              {t(`factor.${f}`)}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--canon-cream)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {factors?.[f] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// STUB ADR-018 — inbox_messages table no shipped pre-FASE 15 ola 2.
// 4 señales: comentario STUB, UI badge "próximamente", doc módulo M13, no tRPC live.
function InboxSectionStub() {
  const t = useTranslations('dev.crm.drawer.inbox');
  return (
    <div
      style={{
        padding: 20,
        textAlign: 'center',
        color: 'var(--canon-cream-3)',
        background: 'var(--canon-bg)',
        borderRadius: 'var(--canon-radius-card)',
        border: '1px dashed var(--canon-border-2)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--canon-cream-2)',
        }}
      >
        {t('comingSoon')}
      </p>
      <p style={{ fontSize: 11 }}>{t('description')}</p>
    </div>
  );
}

// STUB ADR-018 — tareas_dev table no shipped pre-FASE 15 ola 2.
function TareasSectionStub() {
  const t = useTranslations('dev.crm.drawer.tareas');
  return (
    <div
      style={{
        padding: 20,
        textAlign: 'center',
        color: 'var(--canon-cream-3)',
        background: 'var(--canon-bg)',
        borderRadius: 'var(--canon-radius-card)',
        border: '1px dashed var(--canon-border-2)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          color: 'var(--canon-cream-2)',
        }}
      >
        {t('comingSoon')}
      </p>
      <p style={{ fontSize: 11 }}>{t('description')}</p>
    </div>
  );
}
