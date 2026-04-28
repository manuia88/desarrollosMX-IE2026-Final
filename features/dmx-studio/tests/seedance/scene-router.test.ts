// F14.F.7 Sprint 6 — scene-router unit tests (Upgrade 1).
// DMX Studio dentro DMX único entorno (ADR-054).

import { describe, expect, it } from 'vitest';
import { routeSceneToModel } from '@/features/dmx-studio/lib/director/scene-router';

describe('scene-router.routeSceneToModel', () => {
  it('routes plain exterior to kling (cheapest silent)', () => {
    const decision = routeSceneToModel({ sceneType: 'exterior' });
    expect(decision.model).toBe('kling');
    expect(decision.reason).toContain('exterior');
  });

  it('routes cocina to seedance for ambient audio', () => {
    const decision = routeSceneToModel({ sceneType: 'cocina' });
    expect(decision.model).toBe('seedance');
    expect(decision.reason).toContain('ambient');
  });

  it('routes calle to seedance', () => {
    expect(routeSceneToModel({ sceneType: 'calle' }).model).toBe('seedance');
  });

  it('routes jardin / agua / naturaleza to seedance', () => {
    expect(routeSceneToModel({ sceneType: 'jardin' }).model).toBe('seedance');
    expect(routeSceneToModel({ sceneType: 'agua' }).model).toBe('seedance');
    expect(routeSceneToModel({ sceneType: 'naturaleza' }).model).toBe('seedance');
  });

  it('routes panoramica with droneHint to drone', () => {
    const decision = routeSceneToModel({ sceneType: 'panoramica', droneHint: true });
    expect(decision.model).toBe('drone');
    expect(decision.reason).toMatch(/drone/);
  });

  it('routes panoramica without droneHint to kling (cheaper)', () => {
    const decision = routeSceneToModel({ sceneType: 'panoramica' });
    expect(decision.model).toBe('kling');
  });

  it('routes interior_vacio to staging when isEmpty=true', () => {
    const decision = routeSceneToModel({ sceneType: 'interior_vacio', isEmpty: true });
    expect(decision.model).toBe('staging');
    expect(decision.reason).toContain('staged');
  });

  it('routes interior_vacio to staging even when isEmpty omitted', () => {
    const decision = routeSceneToModel({ sceneType: 'interior_vacio' });
    expect(decision.model).toBe('staging');
  });

  it('routes "otro" scene to kling default', () => {
    const decision = routeSceneToModel({ sceneType: 'otro' });
    expect(decision.model).toBe('kling');
    expect(decision.reason).toMatch(/default|cheap/);
  });

  it('hasAudio override forces seedance even on exterior', () => {
    const decision = routeSceneToModel({ sceneType: 'exterior', hasAudio: true });
    expect(decision.model).toBe('seedance');
    expect(decision.reason).toContain('forced');
  });
});
