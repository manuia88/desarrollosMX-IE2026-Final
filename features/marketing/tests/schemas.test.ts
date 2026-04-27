import { describe, expect, it } from 'vitest';
import {
  brandColorsSchema,
  configurePortalInput,
  createFolderInput,
  createLandingInput,
  createQRInput,
  createTemplateInput,
  hexColor,
  landingCopySchema,
  PHOTO_CATEGORIES,
  PORTAL_NAMES,
  PORTAL_REAL_H1,
  PORTAL_STUB_H2,
  publishToPortalInput,
  recordLandingEventInput,
  uploadPhotoInput,
} from '../schemas';

describe('marketing schemas', () => {
  it('hexColor validates 6-digit hex strings', () => {
    expect(hexColor.safeParse('#6366F1').success).toBe(true);
    expect(hexColor.safeParse('#abc').success).toBe(false);
    expect(hexColor.safeParse('rgb(0,0,0)').success).toBe(false);
  });

  it('createLandingInput requires 1..20 projectIds and brand primary', () => {
    const valid = {
      countryCode: 'MX',
      slug: 'torre-napoles',
      template: 'hero',
      projectIds: ['11111111-1111-4111-8111-111111111111'],
      brandColors: { primary: '#6366F1' },
      copy: { headline: 'Vive Nápoles', cta: 'Conoce más' },
    };
    expect(createLandingInput.safeParse(valid).success).toBe(true);

    const invalidTooMany = { ...valid, projectIds: Array(21).fill(valid.projectIds[0]) };
    expect(createLandingInput.safeParse(invalidTooMany).success).toBe(false);

    const invalidEmpty = { ...valid, projectIds: [] };
    expect(createLandingInput.safeParse(invalidEmpty).success).toBe(false);

    const invalidSlug = { ...valid, slug: 'Torre Napoles' };
    expect(createLandingInput.safeParse(invalidSlug).success).toBe(false);
  });

  it('landingCopySchema enforces max headline 120 cta 40', () => {
    const ok = { headline: 'h', cta: 'c' };
    expect(landingCopySchema.safeParse(ok).success).toBe(true);
    const tooLong = { headline: 'x'.repeat(121), cta: 'c' };
    expect(landingCopySchema.safeParse(tooLong).success).toBe(false);
  });

  it('brandColorsSchema requires primary, accent optional', () => {
    expect(brandColorsSchema.safeParse({ primary: '#6366F1' }).success).toBe(true);
    expect(brandColorsSchema.safeParse({}).success).toBe(false);
  });

  it('createQRInput requires destinoType + destinoId', () => {
    expect(createQRInput.safeParse({ destinoType: 'proyecto', destinoId: 'abc' }).success).toBe(
      true,
    );
    expect(createQRInput.safeParse({ destinoType: 'invalid', destinoId: 'abc' }).success).toBe(
      false,
    );
  });

  it('createTemplateInput rules: name 3..100, body 1..1024, footer max 60', () => {
    const ok = {
      name: 'Welcome',
      category: 'marketing' as const,
      body: 'Hola {{1}}',
      placeholders: [],
      headerType: 'none' as const,
      buttons: [],
    };
    expect(createTemplateInput.safeParse(ok).success).toBe(true);

    const tooLong = { ...ok, body: 'x'.repeat(1025) };
    expect(createTemplateInput.safeParse(tooLong).success).toBe(false);
  });

  it('createFolderInput requires title + slug kebab', () => {
    expect(
      createFolderInput.safeParse({ title: 'Cliente Rodrigo', slug: 'cliente-rodrigo' }).success,
    ).toBe(true);
    expect(createFolderInput.safeParse({ title: 'X', slug: 'cliente-rodrigo' }).success).toBe(
      false,
    );
  });

  it('PHOTO_CATEGORIES has 7 canon categories', () => {
    expect(PHOTO_CATEGORIES.length).toBe(7);
    expect(PHOTO_CATEGORIES).toContain('sala');
    expect(PHOTO_CATEGORIES).toContain('plano');
  });

  it('uploadPhotoInput accepts standalone (no project/captacion)', () => {
    const ok = { storagePath: 'bucket/photo.jpg' };
    expect(uploadPhotoInput.safeParse(ok).success).toBe(true);
  });

  it('PORTAL_NAMES has 7 canon (2 real H1 + 5 stub H2)', () => {
    expect(PORTAL_NAMES.length).toBe(7);
    expect(PORTAL_REAL_H1.length).toBe(2);
    expect(PORTAL_STUB_H2.length).toBe(5);
    expect(PORTAL_REAL_H1).toContain('inmuebles24');
    expect(PORTAL_REAL_H1).toContain('easybroker');
  });

  it('configurePortalInput requires non-empty credentials map', () => {
    const ok = { portal: 'inmuebles24' as const, credentials: { api_key: 'xxx' } };
    expect(configurePortalInput.safeParse(ok).success).toBe(true);
    const empty = { portal: 'inmuebles24' as const, credentials: {} };
    expect(configurePortalInput.safeParse(empty).success).toBe(false);
  });

  it('publishToPortalInput requires portal + projectId uuid', () => {
    expect(
      publishToPortalInput.safeParse({
        portal: 'inmuebles24',
        projectId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
    expect(
      publishToPortalInput.safeParse({ portal: 'inmuebles24', projectId: 'not-uuid' }).success,
    ).toBe(false);
  });

  it('recordLandingEventInput accepts page_view/click_cta/lead_submit', () => {
    expect(
      recordLandingEventInput.safeParse({
        landingId: '11111111-1111-4111-8111-111111111111',
        eventType: 'page_view',
      }).success,
    ).toBe(true);
    expect(
      recordLandingEventInput.safeParse({
        landingId: '11111111-1111-4111-8111-111111111111',
        eventType: 'invalid',
      }).success,
    ).toBe(false);
  });
});
