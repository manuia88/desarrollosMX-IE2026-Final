import { router } from '@/server/trpc/init';
import { studioBrandKitRouter } from './brand-kit';
import { studioDashboardRouter } from './dashboard';
import { studioFoundersCohortRouter } from './founders-cohort';
import { studioLandingRouter } from './landing';
import { studioOnboardingRouter } from './onboarding';
import { studioProjectsRouter } from './projects';
import { studioPublicGalleryRouter } from './public-gallery';
import { studioSubscriptionsRouter } from './subscriptions';
import { studioVoiceClonesRouter } from './voice-clones';
import { studioWaitlistRouter } from './waitlist';

export const studioRouter = router({
  brandKit: studioBrandKitRouter,
  dashboard: studioDashboardRouter,
  foundersCohort: studioFoundersCohortRouter,
  landing: studioLandingRouter,
  onboarding: studioOnboardingRouter,
  projects: studioProjectsRouter,
  publicGallery: studioPublicGalleryRouter,
  subscriptions: studioSubscriptionsRouter,
  voiceClones: studioVoiceClonesRouter,
  waitlist: studioWaitlistRouter,
});
