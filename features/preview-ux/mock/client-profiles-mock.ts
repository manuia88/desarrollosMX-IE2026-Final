import type { MockClientProfile } from '../types';

export const CLIENT_PROFILES_MOCK: readonly MockClientProfile[] = [
  {
    id: 'laura-garcia',
    nameKey: 'profiles.laura.name',
    ageRange: '32-38',
    family: 'profiles.laura.family',
    budgetMxn: 5_000_000,
    priority: 'schools',
    proposedZones: [
      { scopeId: 'narvarte', fitPct: 92, rationaleKey: 'profiles.laura.rationale_narvarte' },
      {
        scopeId: 'del-valle-centro',
        fitPct: 87,
        rationaleKey: 'profiles.laura.rationale_del_valle',
      },
      {
        scopeId: 'iztaccihuatl',
        fitPct: 78,
        rationaleKey: 'profiles.laura.rationale_iztaccihuatl',
      },
    ],
    objectionsKey: 'profiles.laura.objections',
  },
  {
    id: 'diego-martinez',
    nameKey: 'profiles.diego.name',
    ageRange: '28-34',
    family: 'profiles.diego.family',
    budgetMxn: 3_200_000,
    priority: 'lifestyle',
    proposedZones: [
      { scopeId: 'roma-norte', fitPct: 94, rationaleKey: 'profiles.diego.rationale_roma_norte' },
      { scopeId: 'condesa', fitPct: 90, rationaleKey: 'profiles.diego.rationale_condesa' },
      { scopeId: 'narvarte', fitPct: 81, rationaleKey: 'profiles.diego.rationale_narvarte' },
    ],
    objectionsKey: 'profiles.diego.objections',
  },
  {
    id: 'sofia-ramirez',
    nameKey: 'profiles.sofia.name',
    ageRange: '40-48',
    family: 'profiles.sofia.family',
    budgetMxn: 8_500_000,
    priority: 'commute',
    proposedZones: [
      { scopeId: 'polanco', fitPct: 89, rationaleKey: 'profiles.sofia.rationale_polanco' },
      {
        scopeId: 'lomas-de-chapultepec',
        fitPct: 84,
        rationaleKey: 'profiles.sofia.rationale_lomas',
      },
      { scopeId: 'santa-fe', fitPct: 76, rationaleKey: 'profiles.sofia.rationale_santa_fe' },
    ],
    objectionsKey: 'profiles.sofia.objections',
  },
];
