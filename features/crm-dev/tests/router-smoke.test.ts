import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

describe('crmDevRouter — module export smoke', () => {
  it('exports the M13 + B.7 expected procedures', async () => {
    const mod = await import('../routes/crm-dev');
    const r = mod.crmDevRouter as unknown as Record<string, unknown>;

    // M13 leads procedures
    expect(r.listLeads).toBeDefined();
    expect(r.createLead).toBeDefined();
    expect(r.updateLead).toBeDefined();
    expect(r.updateLeadStage).toBeDefined();
    expect(r.assignAsesor).toBeDefined();
    expect(r.getLeadTimeline).toBeDefined();
    expect(r.ensureDefaultZone).toBeDefined();

    // B.7 journey procedures
    expect(r.listJourneys).toBeDefined();
    expect(r.createJourney).toBeDefined();
    expect(r.updateJourney).toBeDefined();
    expect(r.pauseJourney).toBeDefined();
    expect(r.getJourneyExecutions).toBeDefined();
    expect(r.enrollLeadInJourney).toBeDefined();
  });
});

describe('crm-dev schemas', () => {
  it('exports stage canon + source enum + journey trigger events', async () => {
    const mod = await import('../schemas');
    expect(mod.LEAD_STAGES).toEqual(['lead', 'interes', 'visita', 'oferta', 'cierre']);
    expect(mod.JOURNEY_TRIGGER_EVENTS).toContain('lead_created');
    expect(mod.JOURNEY_TRIGGER_EVENTS).toContain('lead_score_changed');
    expect(mod.JOURNEY_STEP_TYPES).toEqual(['send_email', 'send_wa', 'wait', 'conditional']);
    expect(mod.statusToStage(undefined)).toBe('lead');
    expect(mod.statusToStage('Visita')).toBe('visita');
    expect(mod.stageToStatus('cierre')).toBe('cierre');
  });
});
