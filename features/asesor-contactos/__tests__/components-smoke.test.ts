import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('asesor-contactos module — exports smoke', () => {
  it('exports ContactosPage + loadContactos + filtersSchema', async () => {
    const mod = await import('../index');
    expect(mod.ContactosPage).toBeDefined();
    expect(mod.loadContactos).toBeDefined();
    expect(mod.filtersSchema).toBeDefined();
  });
});

describe('GC sub-modules — exports smoke', () => {
  it('exports WhatsAppDraftButton + buildWhatsAppDraft', async () => {
    const button = await import('../whatsapp/whatsapp-draft-button');
    const template = await import('../whatsapp/whatsapp-template');
    expect(button.WhatsAppDraftButton).toBeDefined();
    expect(template.buildWhatsAppDraft).toBeDefined();
  });

  it('exports ScanOcrButton + parseIneText + parseBusinessCardText', async () => {
    const button = await import('../scan-ocr/scan-button');
    const parser = await import('../scan-ocr/parse-ine');
    expect(button.ScanOcrButton).toBeDefined();
    expect(parser.parseIneText).toBeDefined();
    expect(parser.parseBusinessCardText).toBeDefined();
  });

  it('exports ReEngagementBanner', async () => {
    const banner = await import('../re-engagement/re-engagement-banner');
    expect(banner.ReEngagementBanner).toBeDefined();
  });

  it('exports EnrichmentPipelineCard', async () => {
    const card = await import('../enrichment/enrichment-pipeline-card');
    expect(card.EnrichmentPipelineCard).toBeDefined();
  });
});
