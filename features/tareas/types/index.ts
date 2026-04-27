import type {
  TareaColumn,
  TareaDetalleTipo,
  TareaPriority,
  TareaStatus,
  TareaType,
} from '@/features/tareas/schemas';
import type { Database } from '@/shared/types/database';

export type TareaRow = Database['public']['Tables']['tareas']['Row'];

export interface TareaCardData {
  id: string;
  asesorId: string;
  type: TareaType;
  entityId: string | null;
  title: string;
  detalleTipo: TareaDetalleTipo;
  description: string | null;
  dueAt: string;
  priority: TareaPriority;
  status: TareaStatus;
  redirectTo: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupedTareas {
  propiedades: TareaCardData[];
  clientes: TareaCardData[];
  prospectos: TareaCardData[];
  general: TareaCardData[];
}

export type GroupedTareasKey = keyof GroupedTareas;

export function rowToCardData(row: TareaRow): TareaCardData {
  return {
    id: row.id,
    asesorId: row.asesor_id,
    type: row.type as TareaType,
    entityId: row.entity_id,
    title: row.title,
    detalleTipo: row.detalle_tipo as TareaDetalleTipo,
    description: row.description,
    dueAt: row.due_at,
    priority: row.priority as TareaPriority,
    status: row.status as TareaStatus,
    redirectTo: row.redirect_to,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function statusOrderRank(status: TareaStatus): number {
  if (status === 'expired') return 0;
  if (status === 'pending') return 1;
  return 2;
}

export function emptyGrouped(): GroupedTareas {
  return { propiedades: [], clientes: [], prospectos: [], general: [] };
}

export type { TareaColumn, TareaDetalleTipo, TareaPriority, TareaStatus, TareaType };
