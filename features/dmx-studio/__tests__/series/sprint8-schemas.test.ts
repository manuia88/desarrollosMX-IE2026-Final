import { describe, expect, it } from 'vitest';
import {
  addEpisodeInput,
  createSeriesInput,
  generateMultiAngleClipInput,
  inviteGuestToEpisodeInput,
  publicSeriesBySlugInput,
  publishSeriesPubliclyInput,
  SERIES_EPISODE_STATUS,
  SERIES_GUEST_ROLES,
  SERIES_MULTI_CAMERA_ANGLES,
  SERIES_NARRATIVE_PHASES,
  SERIES_TEMPLATE_CATEGORIES,
} from '@/features/dmx-studio/schemas';

describe('Sprint 8 schemas F14.F.9', () => {
  it('SERIES_NARRATIVE_PHASES canon 6 valores', () => {
    expect(SERIES_NARRATIVE_PHASES).toContain('planificacion');
    expect(SERIES_NARRATIVE_PHASES).toContain('entrega');
    expect(SERIES_NARRATIVE_PHASES.length).toBe(6);
  });

  it('SERIES_EPISODE_STATUS canon 5 valores', () => {
    expect(SERIES_EPISODE_STATUS.length).toBe(5);
  });

  it('SERIES_TEMPLATE_CATEGORIES canon 4 valores', () => {
    expect(SERIES_TEMPLATE_CATEGORIES.length).toBe(4);
  });

  it('SERIES_GUEST_ROLES canon 4 valores LATERAL 8', () => {
    expect(SERIES_GUEST_ROLES.length).toBe(4);
    expect(SERIES_GUEST_ROLES).toContain('arquitecto');
  });

  it('SERIES_MULTI_CAMERA_ANGLES canon Upgrade 5', () => {
    expect(SERIES_MULTI_CAMERA_ANGLES).toContain('drone_aerial');
    expect(SERIES_MULTI_CAMERA_ANGLES.length).toBe(5);
  });

  it('createSeriesInput valida title required', () => {
    expect(() => createSeriesInput.parse({ title: '' })).toThrow();
    expect(createSeriesInput.parse({ title: 'Test' }).title).toBe('Test');
  });

  it('addEpisodeInput valida episodeNumber positivo', () => {
    expect(() =>
      addEpisodeInput.parse({
        seriesId: '123e4567-e89b-42d3-a456-426614174000',
        episodeNumber: 0,
        title: 'Cap 0',
      }),
    ).toThrow();
  });

  it('publishSeriesPubliclyInput valida slug kebab-case', () => {
    expect(() =>
      publishSeriesPubliclyInput.parse({
        seriesId: '123e4567-e89b-42d3-a456-426614174000',
        publicSlug: 'NotKebab',
      }),
    ).toThrow();
    expect(
      publishSeriesPubliclyInput.parse({
        seriesId: '123e4567-e89b-42d3-a456-426614174000',
        publicSlug: 'mi-serie-2026',
      }).publicSlug,
    ).toBe('mi-serie-2026');
  });

  it('publicSeriesBySlugInput acepta slugs simples', () => {
    expect(
      publicSeriesBySlugInput.parse({ asesorSlug: 'manu-acosta', serieSlug: 'torre-reforma' })
        .asesorSlug,
    ).toBe('manu-acosta');
  });

  it('generateMultiAngleClipInput valida 2-5 angles', () => {
    expect(() =>
      generateMultiAngleClipInput.parse({
        assetId: '123e4567-e89b-42d3-a456-426614174000',
        angles: ['wide'],
      }),
    ).toThrow();
    expect(
      generateMultiAngleClipInput.parse({
        assetId: '123e4567-e89b-42d3-a456-426614174000',
        angles: ['wide', 'medium', 'close_up'],
      }).angles.length,
    ).toBe(3);
  });

  it('inviteGuestToEpisodeInput valida guestType enum', () => {
    expect(
      inviteGuestToEpisodeInput.parse({
        episodeId: '123e4567-e89b-42d3-a456-426614174000',
        guestType: 'arquitecto',
        guestName: 'Pedro',
        photoStoragePath: '/p.jpg',
        voiceSampleStoragePath: '/v.mp3',
      }).guestType,
    ).toBe('arquitecto');
  });
});
