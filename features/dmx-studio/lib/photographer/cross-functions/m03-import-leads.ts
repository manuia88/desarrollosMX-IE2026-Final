// F14.F.10 Sprint 9 BIBLIA — Cross-function M03 Contactos/Leads → Studio Photographer.
// Wrapper compose shared/lib/photographer-clients-cross-feature (read-only).
// Fotógrafo (que devino de asesor) puede importar sus leads M03 como clientes Studio.
//
// Regla R7: NO direct cross-feature import a features/asesor-contactos. SOLO via
// shared/lib/photographer-clients-cross-feature (canon ADR-057).

import {
  type FetchLeadsForPhotographerInput,
  fetchLeadsForPhotographer,
  type ImportLeadsAsClientsResult,
  importLeadsAsPhotographerClients,
  type LeadForImport,
} from '@/shared/lib/photographer-clients-cross-feature';

export type ImportLeadsFromM03FilterCriteria = NonNullable<
  FetchLeadsForPhotographerInput['filterCriteria']
>;

export interface ImportLeadsFromM03Input {
  readonly photographerId: string;
  readonly assignedAsesorId: string;
  readonly filterCriteria?: ImportLeadsFromM03FilterCriteria;
}

export interface ImportLeadsFromM03Result extends ImportLeadsAsClientsResult {
  readonly fetched: number;
}

/**
 * Compose: fetchLeadsForPhotographer (read M03 leads asignados a asesor)
 * → importLeadsAsPhotographerClients (write studio_photographer_clients).
 *
 * Foto plan B2B2C: fotógrafo asesor-devenido puede materializar leads M03 como
 * clientes Studio one-click sin re-capturar contactos.
 */
export async function importLeadsFromM03(
  input: ImportLeadsFromM03Input,
): Promise<ImportLeadsFromM03Result> {
  const fetchInput: FetchLeadsForPhotographerInput = {
    assignedAsesorId: input.assignedAsesorId,
    ...(input.filterCriteria ? { filterCriteria: input.filterCriteria } : {}),
  };
  const leads: ReadonlyArray<LeadForImport> = await fetchLeadsForPhotographer(fetchInput);

  if (leads.length === 0) {
    return {
      fetched: 0,
      imported: 0,
      skipped: 0,
      clientIds: [],
    };
  }

  const importResult = await importLeadsAsPhotographerClients(input.photographerId, leads);

  return {
    fetched: leads.length,
    ...importResult,
  };
}

/**
 * Helper read-only count para conditional render UI sin importar leads.
 * UI usa este helper para decidir si mostrar botón "Importar leads M03".
 */
export async function countAvailableLeadsForImport(
  assignedAsesorId: string,
  filterCriteria?: ImportLeadsFromM03FilterCriteria,
): Promise<number> {
  const fetchInput: FetchLeadsForPhotographerInput = {
    assignedAsesorId,
    ...(filterCriteria ? { filterCriteria } : {}),
  };
  const leads = await fetchLeadsForPhotographer(fetchInput);
  return leads.length;
}
