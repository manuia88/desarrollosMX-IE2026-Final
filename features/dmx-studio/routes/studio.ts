import { router } from '@/server/trpc/init';
import { studioBrandKitRouter } from './brand-kit';
import { studioCopyPackRouter } from './copy-pack';
import { studioCopyVersionsRouter } from './copy-versions';
import { studioCrossFunctionsRouter } from './cross-functions';
import { studioDashboardRouter } from './dashboard';
import { studioFoundersCohortRouter } from './founders-cohort';
import { studioLandingRouter } from './landing';
import { studioLibraryRouter } from './library';
import { studioListingHealthRouter } from './listing-health';
import { studioMultiFormatRouter } from './multi-format';
import { studioOnboardingRouter } from './onboarding';
import { studioProjectsRouter } from './projects';
import { studioPublicGalleryRouter } from './public-gallery';
import { studioSubscriptionsRouter } from './subscriptions';
import { studioUrlImportRouter } from './url-import';
import { studioUsageRouter } from './usage';
import { studioVoiceClonesRouter } from './voice-clones';
import { studioWaitlistRouter } from './waitlist';

export const studioRouter = router({
  brandKit: studioBrandKitRouter,
  copyPack: studioCopyPackRouter,
  copyVersions: studioCopyVersionsRouter,
  crossFunctions: studioCrossFunctionsRouter,
  dashboard: studioDashboardRouter,
  foundersCohort: studioFoundersCohortRouter,
  landing: studioLandingRouter,
  library: studioLibraryRouter,
  listingHealth: studioListingHealthRouter,
  multiFormat: studioMultiFormatRouter,
  onboarding: studioOnboardingRouter,
  projects: studioProjectsRouter,
  publicGallery: studioPublicGalleryRouter,
  subscriptions: studioSubscriptionsRouter,
  urlImport: studioUrlImportRouter,
  usage: studioUsageRouter,
  voiceClones: studioVoiceClonesRouter,
  waitlist: studioWaitlistRouter,
});
