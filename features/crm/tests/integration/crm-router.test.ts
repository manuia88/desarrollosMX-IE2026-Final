import { describe, expect, it } from 'vitest';

describe('crmRouter — module export smoke', () => {
  it('exports crmRouter with expected sub-routers', async () => {
    const mod = await import('@/features/crm/routes/crm');
    expect(mod.crmRouter).toBeDefined();
    const record = mod.crmRouter as unknown as Record<string, unknown>;
    expect(record.lead).toBeDefined();
    expect(record.deal).toBeDefined();
    expect(record.operacion).toBeDefined();
    expect(record.buyerTwin).toBeDefined();
    expect(record.referral).toBeDefined();
    expect(record.familyUnit).toBeDefined();
    expect(record.catalogs).toBeDefined();
  });

  it('CrmRouter type exported', async () => {
    const mod = await import('@/features/crm/routes/crm');
    expect(typeof mod.crmRouter).toBe('object');
  });
});
