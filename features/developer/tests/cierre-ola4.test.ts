import { describe, expect, it } from 'vitest';
import { DEV_NOTIFICATION_TYPES, dispatchDevNotification } from '../lib/notification-types';
import {
  DEV_PLAN_CODES,
  DOC_STATUS,
  DOC_TIPOS,
  devPlanCodeEnum,
  docStatusEnum,
  docTipoEnum,
  documentApproveInput,
  documentCreateInput,
  documentSignedUrlInput,
  switchPlanInput,
} from '../schemas';

describe('FASE 15 cierre OLA 4 — schemas', () => {
  it('DEV_PLAN_CODES contains 4 dev plans', () => {
    expect(DEV_PLAN_CODES).toEqual(['dev_free', 'dev_starter', 'dev_pro', 'dev_enterprise']);
    expect(devPlanCodeEnum.options).toHaveLength(4);
  });

  it('DOC_TIPOS contains 8 categories canon', () => {
    expect(DOC_TIPOS).toContain('planos');
    expect(DOC_TIPOS).toContain('escrituras');
    expect(DOC_TIPOS).toContain('factibilidad');
    expect(docTipoEnum.options).toHaveLength(8);
  });

  it('DOC_STATUS pipeline shipped → approved', () => {
    expect(DOC_STATUS).toEqual([
      'uploaded',
      'extracting',
      'extracted',
      'validated',
      'approved',
      'rejected',
    ]);
    expect(docStatusEnum.options).toHaveLength(6);
  });

  it('documentCreateInput requires uuid + tipo + storagePath', () => {
    const ok = documentCreateInput.parse({
      proyectoId: '00000000-0000-0000-0000-000000000000',
      tipo: 'planos',
      nombre: 'plano-1.pdf',
      storagePath: 'desarrolladora/proyecto/planos/123-plano-1.pdf',
    });
    expect(ok.tipo).toBe('planos');
    expect(() =>
      documentCreateInput.parse({
        proyectoId: 'not-uuid',
        tipo: 'planos',
        nombre: 'x',
        storagePath: 'p',
      }),
    ).toThrow();
  });

  it('documentApproveInput accepts approved/rejected only', () => {
    expect(
      documentApproveInput.parse({
        documentId: '00000000-0000-0000-0000-000000000000',
        status: 'approved',
      }),
    ).toBeDefined();
    expect(() =>
      documentApproveInput.parse({
        documentId: '00000000-0000-0000-0000-000000000000',
        status: 'extracting',
      }),
    ).toThrow();
  });

  it('documentSignedUrlInput clamps expiresIn between 60 and 3600', () => {
    expect(() =>
      documentSignedUrlInput.parse({
        documentId: '00000000-0000-0000-0000-000000000000',
        expiresIn: 30,
      }),
    ).toThrow();
    expect(() =>
      documentSignedUrlInput.parse({
        documentId: '00000000-0000-0000-0000-000000000000',
        expiresIn: 7200,
      }),
    ).toThrow();
    const ok = documentSignedUrlInput.parse({
      documentId: '00000000-0000-0000-0000-000000000000',
    });
    expect(ok.expiresIn).toBe(600);
  });

  it('switchPlanInput accepts valid plan code only', () => {
    expect(switchPlanInput.parse({ planCode: 'dev_pro' }).planCode).toBe('dev_pro');
    expect(() => switchPlanInput.parse({ planCode: 'asesor_pro' })).toThrow();
  });
});

describe('FASE 15 cierre OLA 4 — notification stub (FASE 16 defer)', () => {
  it('DEV_NOTIFICATION_TYPES has 9 types', () => {
    expect(DEV_NOTIFICATION_TYPES).toHaveLength(9);
    expect(DEV_NOTIFICATION_TYPES).toContain('plan_limit_approaching');
    expect(DEV_NOTIFICATION_TYPES).toContain('document_uploaded');
    expect(DEV_NOTIFICATION_TYPES).toContain('export_completed');
  });

  it('dispatchDevNotification returns skipped while notifications table pending', () => {
    const result = dispatchDevNotification({
      profileId: '00000000-0000-0000-0000-000000000000',
      type: 'plan_limit_approaching',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('notifications_table_pending_fase_16');
    }
  });
});
