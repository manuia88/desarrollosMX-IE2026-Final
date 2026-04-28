-- F14.F.10 Sprint 9 BIBLIA — Add 'photographer_bulk' to studio_api_jobs.job_type CHECK.
-- Bulk video processing per photographer (Upgrade 2). Reuses queue infra existing.

alter table public.studio_api_jobs drop constraint if exists studio_api_jobs_job_type_check;

alter table public.studio_api_jobs
  add constraint studio_api_jobs_job_type_check
  check (
    job_type = any (
      array[
        'claude_director'::text,
        'kling_render'::text,
        'seedance_render'::text,
        'elevenlabs_voice'::text,
        'flux_image'::text,
        'vision_classify'::text,
        'heygen_avatar'::text,
        'virtual_staging'::text,
        'sandbox_ffmpeg'::text,
        'deepgram_transcribe'::text,
        'photographer_bulk'::text
      ]
    )
  );
