'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useMemo, useState } from 'react';
import { useCaptacionDrawer } from '../hooks/use-captacion-drawer';
import {
  useCaptacionMutations,
  useInvalidateCaptacionQueries,
} from '../hooks/use-captacion-mutations';
import type { CaptacionSummary } from '../lib/captaciones-loader';
import { type CaptacionStatusKey, STATUS_KEYS } from '../lib/filter-schemas';
import { optimisticMove, validateTransition } from '../lib/kanban-state';
import { CaptacionCard } from './captacion-card';

export interface PipelineKanbanProps {
  captaciones: CaptacionSummary[];
}

interface AnnouncementState {
  message: string | null;
  tone: 'info' | 'error';
}

export function PipelineKanban({ captaciones }: PipelineKanbanProps) {
  const t = useTranslations('AsesorCaptaciones.kanban');
  const { open } = useCaptacionDrawer();
  const { advanceStage } = useCaptacionMutations();
  const invalidate = useInvalidateCaptacionQueries();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverColumn, setHoverColumn] = useState<CaptacionStatusKey | null>(null);
  const [optimistic, setOptimistic] = useState<CaptacionSummary[]>(captaciones);
  const [announcement, setAnnouncement] = useState<AnnouncementState>({
    message: null,
    tone: 'info',
  });

  const cards = useMemo(
    () => (draggingId ? optimistic : captaciones),
    [draggingId, optimistic, captaciones],
  );

  const grouped = useMemo(() => {
    const acc: Record<CaptacionStatusKey, CaptacionSummary[]> = {
      prospecto: [],
      presentacion: [],
      firmado: [],
      en_promocion: [],
      vendido: [],
      cerrado_no_listado: [],
    };
    for (const c of cards) {
      acc[c.status].push(c);
    }
    return acc;
  }, [cards]);

  const handleDragStart = useCallback(
    (id: string) => {
      setDraggingId(id);
      setOptimistic(captaciones);
      setAnnouncement({ message: t('announceDragStart'), tone: 'info' });
    },
    [captaciones, t],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setHoverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (targetStatus: CaptacionStatusKey) => {
      if (!draggingId) return;
      const card = captaciones.find((c) => c.id === draggingId);
      if (!card) return;
      const validation = validateTransition(card.status, targetStatus);
      if (!validation.ok) {
        setAnnouncement({
          message: t(`error.${validation.reason ?? 'illegal'}`),
          tone: 'error',
        });
        setDraggingId(null);
        setHoverColumn(null);
        return;
      }
      // Terminal targets must use close mutation, not advanceStage.
      if (targetStatus === 'vendido' || targetStatus === 'cerrado_no_listado') {
        setAnnouncement({ message: t('error.useCloseDialog'), tone: 'error' });
        setDraggingId(null);
        setHoverColumn(null);
        return;
      }
      const moveResult = optimisticMove(captaciones, draggingId, targetStatus);
      setOptimistic(moveResult.cards);
      advanceStage.mutate(
        { id: draggingId, toStatus: targetStatus },
        {
          onSuccess: () => {
            invalidate.invalidateAll();
            setAnnouncement({
              message: t('announceMoved', { stage: t(`stage.${targetStatus}`) }),
              tone: 'info',
            });
          },
          onError: (err) => {
            setOptimistic(captaciones);
            setAnnouncement({
              message: t('error.serverFailed', { detail: err.message }),
              tone: 'error',
            });
          },
        },
      );
      setDraggingId(null);
      setHoverColumn(null);
    },
    [draggingId, captaciones, advanceStage, t, invalidate.invalidateAll],
  );

  const handleKeyboardMove = useCallback(
    (cardId: string, currentStatus: CaptacionStatusKey, direction: 1 | -1) => {
      const idx = STATUS_KEYS.indexOf(currentStatus);
      const next = STATUS_KEYS[idx + direction];
      if (!next) return;
      if (next === 'vendido' || next === 'cerrado_no_listado') {
        setAnnouncement({ message: t('error.useCloseDialog'), tone: 'error' });
        return;
      }
      const validation = validateTransition(currentStatus, next);
      if (!validation.ok) {
        setAnnouncement({
          message: t(`error.${validation.reason ?? 'illegal'}`),
          tone: 'error',
        });
        return;
      }
      advanceStage.mutate(
        { id: cardId, toStatus: next },
        {
          onSuccess: () => {
            invalidate.invalidateAll();
            setAnnouncement({
              message: t('announceMoved', { stage: t(`stage.${next}`) }),
              tone: 'info',
            });
          },
          onError: (err) => {
            setAnnouncement({
              message: t('error.serverFailed', { detail: err.message }),
              tone: 'error',
            });
          },
        },
      );
    },
    [advanceStage, t, invalidate.invalidateAll],
  );

  const containerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${STATUS_KEYS.length}, minmax(240px, 1fr))`,
    gap: 12,
    padding: '16px 28px 80px',
    overflowX: 'auto',
  };

  const columnStyle = (active: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 12,
    borderRadius: 'var(--canon-radius-card)',
    background: active ? 'var(--surface-spotlight, var(--canon-bg-2))' : 'var(--canon-bg)',
    border: `1px dashed ${active ? 'var(--mod-captaciones)' : 'var(--canon-border-2)'}`,
    minHeight: 240,
    transition: 'background 200ms var(--canon-ease-out), border-color 200ms var(--canon-ease-out)',
  });

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottom: '1px solid var(--canon-border)',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--canon-cream)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const countStyle: CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontVariantNumeric: 'tabular-nums',
    color: 'var(--canon-cream-2)',
    fontWeight: 600,
    fontSize: 11,
  };

  const liveRegionStyle: CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    margin: -1,
    padding: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  return (
    <>
      <div style={liveRegionStyle} role="status" aria-live="polite" aria-atomic="true">
        {announcement.message ?? ''}
      </div>
      <section aria-label={t('ariaLabel')} style={containerStyle}>
        {STATUS_KEYS.map((status) => {
          const cardsInCol = grouped[status];
          const isHover = hoverColumn === status;
          return (
            <section
              key={status}
              style={columnStyle(isHover)}
              data-kanban-column={status}
              onDragOver={(e) => {
                if (draggingId) {
                  e.preventDefault();
                  setHoverColumn(status);
                }
              }}
              onDragLeave={() => {
                if (hoverColumn === status) setHoverColumn(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDrop(status);
              }}
              aria-label={t(`stage.${status}`)}
            >
              <header style={headerStyle}>
                <span>{t(`stage.${status}`)}</span>
                <span style={countStyle}>{cardsInCol.length}</span>
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
                {cardsInCol.map((c) => {
                  const isTerminal = c.status === 'vendido' || c.status === 'cerrado_no_listado';
                  return (
                    <li key={c.id} style={{ position: 'relative' }}>
                      <CaptacionCard
                        captacion={c}
                        onOpen={open}
                        draggable={!isTerminal}
                        {...(!isTerminal
                          ? { onDragStart: handleDragStart, onDragEnd: handleDragEnd }
                          : {})}
                      />
                      {!isTerminal ? (
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
                            onClick={() => handleKeyboardMove(c.id, c.status, -1)}
                            aria-label={t('ariaMoveBack')}
                            style={kbButtonStyle()}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKeyboardMove(c.id, c.status, 1)}
                            aria-label={t('ariaMoveFwd')}
                            style={kbButtonStyle()}
                          >
                            →
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
                {cardsInCol.length === 0 ? (
                  <li
                    style={{
                      padding: '24px 8px',
                      textAlign: 'center',
                      fontSize: 11,
                      color: 'var(--canon-cream-3)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {t('emptyColumn')}
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

function kbButtonStyle(): CSSProperties {
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
