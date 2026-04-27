// FASE 14.F.3 Sprint 2 BIBLIA Tarea 2.4 — Library shared types.

import type { z } from 'zod';
import type {
  studioLibraryDateRangeEnum,
  studioProjectTypeEnum,
  studioVideoFormatEnum,
} from '@/features/dmx-studio/schemas';

export type StudioProjectType = z.infer<typeof studioProjectTypeEnum>;
export type StudioVideoFormat = z.infer<typeof studioVideoFormatEnum>;
export type StudioLibraryDateRange = z.infer<typeof studioLibraryDateRangeEnum>;

export interface LibraryProjectShape {
  readonly id: string;
  readonly title: string | null;
  readonly project_type: StudioProjectType;
  readonly status: string;
}

export interface LibraryVideoRow {
  readonly id: string;
  readonly project_id: string;
  readonly hook_variant: 'hook_a' | 'hook_b' | 'hook_c';
  readonly format: StudioVideoFormat;
  readonly storage_url: string | null;
  readonly thumbnail_url: string | null;
  readonly duration_seconds: number | null;
  readonly size_bytes: number | null;
  readonly render_status: string;
  readonly is_branded: boolean | null;
  readonly has_beat_sync: boolean | null;
  readonly has_branding_overlay: boolean | null;
  readonly selected_by_user: boolean | null;
  readonly created_at: string;
  readonly studio_video_projects: LibraryProjectShape | ReadonlyArray<LibraryProjectShape> | null;
}

export function pickProject(
  raw: LibraryVideoRow['studio_video_projects'],
): LibraryProjectShape | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw as LibraryProjectShape;
}
