// F14.F.6 Sprint 5 BIBLIA — browser-safe constants para raw video uploader.
// Aislado de audio-extractor.ts (server-only @vercel/sandbox).

export const RAW_VIDEO_MAX_BYTES = 524_288_000;
export const RAW_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const;
export type RawVideoMimeType = (typeof RAW_VIDEO_MIME_TYPES)[number];
export const RAW_VIDEO_BUCKET = 'studio-raw-videos';
export const RAW_AUDIO_BUCKET = 'studio-raw-audio';
