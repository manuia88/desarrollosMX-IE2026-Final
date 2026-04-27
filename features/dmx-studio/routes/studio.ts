import { router } from '@/server/trpc/init';
import { studioBrandKitRouter } from './brand-kit';
import { studioDashboardRouter } from './dashboard';
import { studioFoundersCohortRouter } from './founders-cohort';
import { studioLandingRouter } from './landing';
import { studioLibraryRouter } from './library';
import { studioMultiFormatRouter } from './multi-format';
import { studioOnboardingRouter } from './onboarding';
import { studioProjectsRouter } from './projects';
import { studioPublicGalleryRouter } from './public-gallery';
import { studioSubscriptionsRouter } from './subscriptions';
import { studioUsageRouter } from './usage';
import { studioVoiceClonesRouter } from './voice-clones';
import { studioWaitlistRouter } from './waitlist';

export const studioRouter = router({
  brandKit: studioBrandKitRouter,
  dashboard: studioDashboardRouter,
  foundersCohort: studioFoundersCohortRouter,
  landing: studioLandingRouter,
  library: studioLibraryRouter,
  multiFormat: studioMultiFormatRouter,
  onboarding: studioOnboardingRouter,
  projects: studioProjectsRouter,
  publicGallery: studioPublicGalleryRouter,
  subscriptions: studioSubscriptionsRouter,
  usage: studioUsageRouter,
  voiceClones: studioVoiceClonesRouter,
  waitlist: studioWaitlistRouter,
});
