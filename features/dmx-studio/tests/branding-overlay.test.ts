// FASE 14.F.3 Sprint 2 — Branding overlay generator + plan logic tests.
// Modo A: pure-function tests sin sandbox real. Cero créditos API.

import { describe, expect, it } from 'vitest';
import {
  buildBottomBarCommand,
  buildFullBrandingCommand,
  buildIntroOutroOverlayCommand,
  buildLogoOverlayCommand,
} from '@/features/dmx-studio/lib/assembler/branding/ffmpeg-overlay-generator';
import { shouldApplyBranding } from '@/features/dmx-studio/lib/assembler/branding/plan-logic';

describe('buildLogoOverlayCommand', () => {
  it('genera overlay bottom-right con coords W-w-30:H-h-30 y alpha 0.85', () => {
    const cmd = buildLogoOverlayCommand(
      '/tmp/in.mp4',
      '/tmp/logo.png',
      '/tmp/out.mp4',
      'bottom-right',
    );
    expect(cmd).toContain('overlay=W-w-30:H-h-30');
    expect(cmd).toContain('alpha=0.85');
    expect(cmd).toContain('scale=120:120');
    expect(cmd).toContain('-i "/tmp/in.mp4"');
    expect(cmd).toContain('-i "/tmp/logo.png"');
    expect(cmd).toContain('"/tmp/out.mp4"');
  });
});

describe('buildBottomBarCommand', () => {
  it('incluye drawbox + drawtext con name + phone + brandColor + duration window', () => {
    const cmd = buildBottomBarCommand(
      '/tmp/in.mp4',
      'María Lopez',
      '+52 55 1234 5678',
      '#6366F1',
      60,
      '/tmp/out.mp4',
    );
    expect(cmd).toContain('drawbox=');
    expect(cmd).toContain('drawtext=');
    expect(cmd).toContain('María Lopez');
    expect(cmd).toContain('+52 55 1234 5678');
    expect(cmd).toContain('color=#6366F1@0.92');
    expect(cmd).toContain('between(t,57.00,60.00)');
  });
});

describe('buildIntroOutroOverlayCommand', () => {
  it('intro only respeta enable between(t,0,3) sin outro filter', () => {
    const cmd = buildIntroOutroOverlayCommand('/tmp/in.mp4', 'Bienvenido', null, '/tmp/out.mp4');
    expect(cmd).toContain("enable='between(t,0,3)'");
    expect(cmd).toContain('Bienvenido');
    expect(cmd).not.toContain('between(t,duration-3,duration)');
  });
});

describe('buildFullBrandingCommand', () => {
  it('combina logo overlay + bottom bar + intro + outro en filter_complex', () => {
    const cmd = buildFullBrandingCommand({
      videoPath: '/tmp/in.mp4',
      logoPath: '/tmp/logo.png',
      name: 'Asesor Demo',
      phone: '+52 55 0000 0000',
      brandColor: '#EC4899',
      durationSeconds: 45,
      outputPath: '/tmp/out.mp4',
      introText: 'Hola',
      outroText: 'Contáctame',
    });
    expect(cmd).toContain('-filter_complex');
    expect(cmd).toContain('Asesor Demo');
    expect(cmd).toContain('+52 55 0000 0000');
    expect(cmd).toContain('color=#EC4899@0.92');
    expect(cmd).toContain('Hola');
    expect(cmd).toContain('Contáctame');
    expect(cmd).toContain('overlay=W-w-30:H-h-30');
    expect(cmd).toContain('between(t,0,3)');
  });
});

describe('shouldApplyBranding', () => {
  it('pro plan default true, foto plan default false, agency plan default true', () => {
    expect(shouldApplyBranding('pro', null)).toBe(true);
    expect(shouldApplyBranding('foto', null)).toBe(false);
    expect(shouldApplyBranding('agency', null)).toBe(true);
  });

  it('userOverride wins sobre default del plan cuando !== null', () => {
    expect(shouldApplyBranding('pro', false)).toBe(false);
    expect(shouldApplyBranding('foto', true)).toBe(true);
    expect(shouldApplyBranding('agency', false)).toBe(false);
  });
});
