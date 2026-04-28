'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { useInvalidateCrmDevQueries, useUpdateDevLeadStage } from '../hooks/use-crm-dev';
import { LEAD_STAGES, type LeadStage, statusToStage } from '../schemas';
import { LeadDevCard } from './LeadDevCard';

export interface DevLeadRow {
  readonly id: string;
  readonly contact_name: string;
  readonly contact_email: string | null;
  readonly contact_phone: string | null;
  readonly source_id: string;
  readonly status: string;
  readonly assigned_asesor_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly score: number | null;
  readonly tier: 'hot' | 'warm' | 'cold' | null;
}

export interface DevCRMKanbanProps {
  readonly leads: readonly DevLeadRow[];
  readonly onOpenLead: (id: string) => void;
}

interface AnnouncementState {
  message: string | null;
  tone: 'info' | 'error';
}

export function DevCRMKanban({ leads, onOpenLead }: DevCRMKanbanProps) {
  const t = useTranslations('dev.crm');
  const updateStage = useUpdateDevLeadStage();
  const invalidate = useInvalidateCrmDevQueries();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<LeadStage | null>(null);
  const [optimistic, setOptimistic] = useState<readonly DevLeadRow[] | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementState>({
    message: null,
    tone: 'info',
  });

  const cards = optimistic ?? leads;

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      const sa = a.score ?? -1;
      const sb = b.score ?? -1;
      return sb - sa;
    });
  }, [cards]);

  const grouped = useMemo(() => {
    const acc: Record<LeadStage, DevLeadRow[]> = {
      lead: [],
      interes: [],
      visita: [],
      oferta: [],
      cierre: [],
    };
    for (const c of sortedCards) {
      const stage = statusToStage(c.status);
      acc[stage].push(c);
    }
    return acc;
  }, [sortedCards]);

  const handleDragStart = useCallback(
    (id: string) => {
      setDraggingId(id);
      setAnnouncement({ message: t('kanban.dragStart'), tone: 'info' });
    },
    [t],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setHoverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (targetStage: LeadStage) => {
      if (!draggingId) return;
      const card = leads.find((c) => c.id === draggingId);
      if (!card) return;
      const currentStage = statusToStage(card.status);
      if (currentStage === targetStage) {
        setDraggingId(null);
        setHoverColumn(null);
        return;
      }

      const updated = leads.map((l) => (l.id === draggingId ? { ...l, status: targetStage } : l));
      setOptimistic(updated);

      updateStage.mutate(
        { leadId: draggingId, stage: targetStage },
        {
          onSuccess: () => {
            invalidate.invalidateLeads();
            setOptimistic(null);
            setAnnouncement({
              message: t('kanban.movedTo', { stage: t(`stage.${targetStage}`) }),
              tone: 'info',
            });
          },
          onError: (err) => {
            setOptimistic(null);
            setAnnouncement({
              message: t('kanban.serverError', { detail: err.message }),
              tone: 'error',
            });
          },
        },
      );
      setDraggingId(null);
      setHoverColumn(null);
    },
    [draggingId, leads, updateStage, t, invalidate.invalidateLeads],
  );

  const handleKeyMove = useCallback(
    (id: string, currentStage: LeadStage, dir: 1 | -1) => {
      const idx = LEAD_STAGES.indexOf(currentStage);
      const next = LEAD_STAGES[idx + dir];
      if (!next) return;
      updateStage.mutate(
        { leadId: id, stage: next },
        {
          onSuccess: () => {
            invalidate.invalidateLeads();
            setAnnouncement({
              message: t('kanban.movedTo', { stage: t(`stage.${next}`) }),
              tone: 'info',
            });
          },
          onError: (err) => {
            setAnnouncement({
              message: t('kanban.serverError', { detail: err.message }),
              tone: 'error',
            });
          },
        },
      );
    },
    [updateStage, t, invalidate.invalidateLeads],
  );

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${LEAD_STAGES.length}, minmax(240px, 1fr))`,
    gap: 12,
    padding: '16px 0',
    overflowX: 'auto',
  };

  const columnStyle = (active: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
    borderRadius: 'var(--canon-radius-card)',
    background: active ? 'var(--surface-spotlight, var(--canon-bg-2))' : 'var(--canon-bg)',
    border: `1px dashed ${active ? 'var(--canon-indigo-2)' : 'var(--canon-border-2)'}`,
    minHeight: 320,
    transition: 'background 200ms var(--canon-ease-out), border-color 200ms var(--canon-ease-out)',
  });

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid var(--canon-border)',
    fontFamily: 'var(--font-display)',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const liveRegionStyle: CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0,0,0,0)',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <div style={liveRegionStyle} role="status" aria-live="polite" aria-atomic="true">
        {announcement.message ?? ''}
      </div>
      <section aria-label={t('kanban.aria')} style={containerStyle}>
        {LEAD_STAGES.map((stage) => {
          const colCards = grouped[stage];
          const isHover = hoverColumn === stage;
          return (
            <section
              key={stage}
              data-kanban-column={stage}
              style={columnStyle(isHover)}
              onDragOver={(e) => {
                if (draggingId) {
                  e.preventDefault();
                  setHoverColumn(stage);
                }
              }}
              onDragLeave={() => {
                if (hoverColumn === stage) setHoverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(stage);
              }}
              aria-label={t(`stage.${stage}`)}
            >
              <header style={headerStyle}>
                <span>{t(`stage.${stage}`)}</span>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--canon-cream-2)',
                    fontSize: 11,
                  }}
                >
                  {colCards.length}
                </span>
              </header>
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
                {colCards.map((c) => (
                  <li key={c.id} style={{ position: 'relative' }}>
                    <LeadDevCard
                      lead={c}
                      onOpen={onOpenLead}
                      draggable
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        justifyContent: 'flex-end',
                        paddingTop: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleKeyMove(c.id, statusToStage(c.status), -1)}
                        aria-label={t('kanban.moveBack')}
                        style={kbBtnStyle()}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => handleKeyMove(c.id, statusToStage(c.status), 1)}
                        aria-label={t('kanban.moveForward')}
                        style={kbBtnStyle()}
                      >
                        →
                      </button>
                    </div>
                  </li>
                ))}
                {colCards.length === 0 ? (
                  <li
                    style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--canon-cream-3)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {t('kanban.emptyColumn')}
                  </li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </section>
    </>
  );
}

function kbBtnStyle(): CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 'var(--canon-radius-pill)',
    border: '1px solid var(--canon-border-2)',
    background: 'transparent',
    color: 'var(--canon-cream-2)',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    cursor: 'pointer',
  };
}
