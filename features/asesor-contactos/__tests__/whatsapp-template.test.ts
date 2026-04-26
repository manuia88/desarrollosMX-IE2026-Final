import { describe, expect, it } from 'vitest';
import type { ContactoSummary } from '../lib/contactos-loader';
import { buildWhatsAppDraft } from '../whatsapp/whatsapp-template';

const baseContacto: ContactoSummary = {
  id: '00000000-0000-4000-8000-000000000001',
  contactName: 'Juan Pérez',
  contactEmail: 'juan@example.com',
  contactPhone: '+52 55 1234 5678',
  status: 'qualified',
  qualificationScore: 75,
  countryCode: 'MX',
  zoneId: '00000000-0000-4000-8000-000000000010',
  sourceId: '00000000-0000-4000-8000-000000000011',
  notes: null,
  createdAt: '2026-04-25T10:00:00Z',
  updatedAt: '2026-04-26T10:00:00Z',
  assignedAsesorId: 'asesor-1',
  brokerageId: null,
  buyerTwinId: null,
  disc: null,
  hasFamilyUnit: false,
  birthdayInDays: null,
  daysSinceLastContact: 5,
  metadata: {},
};

describe('buildWhatsAppDraft', () => {
  it('produces follow_up template with first name', () => {
    const result = buildWhatsAppDraft(baseContacto, 'follow_up');
    expect(result.template_md).toContain('Juan');
    expect(result.template_md).toContain('retomar');
    expect(result.url).toContain('https://web.whatsapp.com/send');
  });

  it('produces birthday template with celebration', () => {
    const result = buildWhatsAppDraft(baseContacto, 'birthday');
    expect(result.template_md).toContain('cumpleaños');
  });

  it('reengagement uses daysSinceLastContact', () => {
    const result = buildWhatsAppDraft(
      { ...baseContacto, daysSinceLastContact: 42 },
      'reengagement',
    );
    expect(result.template_md).toContain('42');
  });

  it('returns empty url when contact has no phone', () => {
    const result = buildWhatsAppDraft({ ...baseContacto, contactPhone: null }, 'follow_up');
    expect(result.url).toBe('');
    expect(result.fallbackPhone).toBeNull();
  });

  it('adapts message body by DISC dominance D', () => {
    const result = buildWhatsAppDraft(
      { ...baseContacto, disc: { D: 8, I: 2, S: 1, C: 1 } },
      'follow_up',
    );
    expect(result.template_md).toContain('valor y rapidez');
  });

  it('adapts message body by DISC dominance I', () => {
    const result = buildWhatsAppDraft(
      { ...baseContacto, disc: { D: 1, I: 8, S: 1, C: 1 } },
      'follow_up',
    );
    expect(result.template_md).toContain('encantarte');
  });

  it('adapts message body by DISC dominance S', () => {
    const result = buildWhatsAppDraft(
      { ...baseContacto, disc: { D: 1, I: 1, S: 8, C: 1 } },
      'follow_up',
    );
    expect(result.template_md).toContain('estable');
  });

  it('adapts message body by DISC dominance C', () => {
    const result = buildWhatsAppDraft(
      { ...baseContacto, disc: { D: 1, I: 1, S: 1, C: 8 } },
      'follow_up',
    );
    expect(result.template_md).toContain('números muy claros');
  });

  it('adds country prefix 52 to 10-digit phone', () => {
    const result = buildWhatsAppDraft({ ...baseContacto, contactPhone: '5512345678' }, 'follow_up');
    expect(result.url).toContain('phone=525512345678');
  });
});
