import { describe, expect, it } from 'vitest';

describe('crmRouter.notes — module export smoke', () => {
  it('exports notes sub-router from crmRouter', async () => {
    const mod = await import('@/features/crm/routes/crm');
    expect(mod.crmRouter).toBeDefined();
    const record = mod.crmRouter as unknown as Record<string, unknown>;
    expect(record.notes).toBeDefined();
  });

  it('contactNotesRouter exposes 4 procedures (list, create, update, delete)', async () => {
    const mod = await import('@/features/crm/routes/notes');
    expect(mod.contactNotesRouter).toBeDefined();
    const record = mod.contactNotesRouter as unknown as Record<string, unknown>;
    expect(record.list).toBeDefined();
    expect(record.create).toBeDefined();
    expect(record.update).toBeDefined();
    expect(record.delete).toBeDefined();
  });

  it('exports ContactNotesRouter type', async () => {
    const mod = await import('@/features/crm/routes/notes');
    expect(typeof mod.contactNotesRouter).toBe('object');
  });

  it('crmRouter integrates notes alongside other sub-routers', async () => {
    const mod = await import('@/features/crm/routes/crm');
    const record = mod.crmRouter as unknown as Record<string, unknown>;
    expect(record.lead).toBeDefined();
    expect(record.deal).toBeDefined();
    expect(record.notes).toBeDefined();
  });
});
