// F14.F.7 Sprint 6 BIBLIA v4 §6 — Smart scene routing (Upgrade 1).
// DMX Studio dentro DMX único entorno (ADR-054).
// Pure router: maps a SceneInput to the cheapest viable model based on
// scene semantics + audio expectation. No SDK calls, no I/O.
//
// Cost optimization rationale (ordered by cost ascending):
//   - kling     : ~$0.05/s — silent cinematic video; default for plain exteriors
//                 and "otro" scenes where ambient audio adds no narrative value.
//   - seedance  : ~$0.08/s — native ambient audio; required when the scene
//                 narratively benefits from sound (kitchen activity, garden
//                 birds, water, urban life).
//   - drone     : premium ($0.12+/s budget) — reserved for "panoramica" scenes
//                 explicitly marked drone-style for sweeping aerials.
//   - staging   : virtual-staging first pass; only for empty interiors that
//                 must be furnished BEFORE any video clip is generated.

export const SCENE_TYPES = [
  'exterior',
  'cocina',
  'calle',
  'jardin',
  'interior_vacio',
  'panoramica',
  'agua',
  'naturaleza',
  'otro',
] as const;

export type SceneType = (typeof SCENE_TYPES)[number];

export type SceneRoutedModel = 'kling' | 'seedance' | 'drone' | 'staging';

export interface SceneInput {
  readonly sceneType: SceneType;
  readonly hasAudio?: boolean;
  readonly isEmpty?: boolean;
  readonly droneHint?: boolean;
}

export interface SceneRoutingDecision {
  readonly model: SceneRoutedModel;
  readonly reason: string;
}

export function routeSceneToModel(scene: SceneInput): SceneRoutingDecision {
  if (scene.isEmpty === true && scene.sceneType === 'interior_vacio') {
    return {
      model: 'staging',
      reason: 'empty interior must be virtually staged before any video clip',
    };
  }

  if (scene.sceneType === 'panoramica' && scene.droneHint === true) {
    return {
      model: 'drone',
      reason: 'panoramic scene with drone hint — premium aerial sweep',
    };
  }

  if (scene.hasAudio === true) {
    return {
      model: 'seedance',
      reason: 'caller forced ambient audio — seedance native audio required',
    };
  }

  switch (scene.sceneType) {
    case 'cocina':
    case 'calle':
    case 'jardin':
    case 'agua':
    case 'naturaleza':
      return {
        model: 'seedance',
        reason: `scene "${scene.sceneType}" benefits from native ambient audio`,
      };
    case 'panoramica':
      return {
        model: 'kling',
        reason: 'panoramic without drone hint — kling cheaper sweep',
      };
    case 'exterior':
      return {
        model: 'kling',
        reason: 'standard exterior — kling cheapest silent cinematic',
      };
    case 'interior_vacio':
      return {
        model: 'staging',
        reason: 'empty interior — must furnish via staging first',
      };
    default:
      return {
        model: 'kling',
        reason: 'unknown scene — defaulting to cheapest kling clip',
      };
  }
}
