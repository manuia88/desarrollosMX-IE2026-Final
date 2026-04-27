// FASE 14.F.2 Sprint 1 — Local re-export of submitProjectFeedbackInput schema
// Mirrors features/dmx-studio/schemas (read-only for sub-agent 5). Provides
// type alias for use inside FeedbackForm component.

import type { z } from 'zod';
import { submitProjectFeedbackInput } from '@/features/dmx-studio/schemas';

export { submitProjectFeedbackInput };
export type SubmitProjectFeedback = z.infer<typeof submitProjectFeedbackInput>;
