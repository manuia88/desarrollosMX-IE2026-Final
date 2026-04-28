'use client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { createClient } from '@/shared/lib/supabase/client';
import type { Database } from '@/shared/types/database';

type UnidadRow = Database['public']['Tables']['unidades']['Row'];
type Event = 'INSERT' | 'UPDATE' | 'DELETE';

export interface UseRealtimeUnitsOptions {
  proyectoId: string | null;
  enabled?: boolean;
  onChange: (event: Event, row: UnidadRow | null, oldRow: UnidadRow | null) => void;
}

// FASE 15.B M11 — Supabase Realtime subscription for unidades changes per proyecto
// Channel: unidades:proyecto_id=eq.<proyectoId>
// Hook respects enabled flag and cleans up on unmount or proyecto change.
export function useRealtimeUnits({
  proyectoId,
  enabled = true,
  onChange,
}: UseRealtimeUnitsOptions): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!enabled || !proyectoId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`unidades:${proyectoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unidades',
          filter: `proyecto_id=eq.${proyectoId}`,
        },
        (payload: RealtimePostgresChangesPayload<UnidadRow>) => {
          const event = payload.eventType as Event;
          const newRow =
            payload.new && Object.keys(payload.new).length > 0 ? (payload.new as UnidadRow) : null;
          const oldRow =
            payload.old && Object.keys(payload.old).length > 0 ? (payload.old as UnidadRow) : null;
          onChangeRef.current(event, newRow, oldRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proyectoId, enabled]);
}
