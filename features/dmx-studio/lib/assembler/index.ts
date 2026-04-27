// FASE 14.F.2 Sprint 1 — DMX Studio assembler entrypoint.

export {
  buildConcatCommand,
  buildCrossfadeCommand,
  buildExport9x16Command,
  buildMusicMixCommand,
  buildOverlayNarrationCommand,
} from './ffmpeg-commands';
export { getSandboxConfig, type SandboxConfig } from './sandbox-config';
export {
  type AssembleVideoInput,
  type AssembleVideoOutputDescriptor,
  type AssembleVideoResult,
  assembleVideo,
  type StudioHookVariant,
  type StudioVideoFormat,
} from './video-assembler';
