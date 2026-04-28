'use client';

// F14.F.10 Sprint 9 BIBLIA — Importar leads M03 → studio_photographer_clients.
// STUB ADR-018 — H1 manual SQL import via founder. tRPC procedure pending H2.
//
// 4 señales STUB:
//   1. Comentario header explícito (este).
//   2. Botón disabled + label explica "Importación pendiente automatización H2".
//   3. Modal abre con mensaje + link a docs procedimiento manual.
//   4. data-testid='import-leads-stub' marker para audit:dead-ui.
//
// Activar H2:
//   1. Agregar tRPC procedure `studio.sprint9Photographer.importLeadsM03` en
//      sprint9-photographer.ts (no parte de scope SUB-AGENT 5).
//   2. Reemplazar handler con mutation real que llama
//      features/dmx-studio/lib/photographer/cross-functions/m03-import-leads.ts
//      → importLeadsFromM03.
//   3. Set IMPORT_LEADS_AUTOMATION_ENABLED=true.

import { useCallback, useState } from 'react';
import { Button } from '@/shared/ui/primitives/canon';

/** Hardcoded H1 canon: tRPC procedure pending → automation disabled. */
const IMPORT_LEADS_AUTOMATION_ENABLED = false as const;

export interface ImportLeadsButtonProps {
  readonly availableLeadsCount?: number;
}

const importIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

export function ImportLeadsButton({ availableLeadsCount = 0 }: ImportLeadsButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasLeads = availableLeadsCount > 0;

  const handleClick = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
  }, []);

  if (!hasLeads) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="md"
        onClick={handleClick}
        data-testid="import-leads-trigger"
        aria-label={`Importar ${availableLeadsCount} leads desde M03 Contactos`}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {importIcon}
          Importar {availableLeadsCount} leads M03
        </span>
      </Button>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-leads-modal-title"
          data-testid="import-leads-modal"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '24px',
          }}
          onClick={handleClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleClose();
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'var(--surface-elevated)',
              borderRadius: 'var(--canon-radius-card)',
              border: '1px solid var(--canon-border)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
          >
            <h3
              id="import-leads-modal-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '20px',
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
              }}
            >
              Importar leads M03
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13.5px',
                lineHeight: 1.55,
                color: 'var(--canon-cream-2)',
              }}
            >
              Tienes <strong style={{ color: '#FFFFFF' }}>{availableLeadsCount}</strong> leads
              activos en M03 Contactos. La importación automatizada se habilitará en H2.
            </p>
            {!IMPORT_LEADS_AUTOMATION_ENABLED && (
              <div
                data-testid="import-leads-stub"
                role="status"
                style={{
                  padding: '12px 14px',
                  background: 'rgba(99,102,241,0.10)',
                  border: '1px dashed var(--canon-border-2)',
                  borderRadius: 'var(--canon-radius-card)',
                  fontSize: '12.5px',
                  color: 'var(--canon-cream-2)',
                  lineHeight: 1.55,
                }}
              >
                Importación pendiente automatización H2. En H1, el equipo Studio puede importar
                leads vía SQL manual. Contacta soporte para coordinar la importación inicial.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                data-testid="import-leads-close"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
