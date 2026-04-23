import type { MockFeasibility } from '../types';

export const FEASIBILITY_MOCK: MockFeasibility = {
  roiPct: 24.6,
  absorptionMonths: 14,
  competitorUnits: 680,
  pricePerM2Mxn: 68_400,
  pipelineProjects: [
    { id: 'proj-01', nameKey: 'feasibility.project_vertex', unitCount: 120, status: 'in_progress' },
    { id: 'proj-02', nameKey: 'feasibility.project_meridiano', unitCount: 88, status: 'presale' },
    { id: 'proj-03', nameKey: 'feasibility.project_allure', unitCount: 144, status: 'announced' },
    { id: 'proj-04', nameKey: 'feasibility.project_parque', unitCount: 96, status: 'in_progress' },
    { id: 'proj-05', nameKey: 'feasibility.project_arboleda', unitCount: 72, status: 'presale' },
  ],
};
