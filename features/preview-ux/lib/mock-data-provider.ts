import { AGENTES_MOCK } from '../mock/agentes-mock';
import { CLIENT_PROFILES_MOCK } from '../mock/client-profiles-mock';
import { FEASIBILITY_MOCK } from '../mock/feasibility-mock';
import { NARVARTE_MOCK } from '../mock/narvarte-mock';
import type { PersonaType, PreviewMockBundle } from '../types';

const BUNDLE: PreviewMockBundle = {
  narvarte: NARVARTE_MOCK,
  clientProfiles: CLIENT_PROFILES_MOCK,
  agents: AGENTES_MOCK,
  feasibility: FEASIBILITY_MOCK,
};

export function getPreviewMockData(_persona: PersonaType): PreviewMockBundle {
  return BUNDLE;
}

export function getNarvarteMock() {
  return BUNDLE.narvarte;
}
