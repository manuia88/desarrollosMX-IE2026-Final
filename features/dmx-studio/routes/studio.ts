import { router } from '@/server/trpc/init';
import { studioAiCoachRouter } from './ai-coach';
import { studioBatchModeRouter } from './batch-mode';
import { studioBrandKitRouter } from './brand-kit';
import { studioCalendarRouter } from './calendar';
import { studioChallengesRouter } from './challenges';
import { studioCopyPackRouter } from './copy-pack';
import { studioCopyVersionsRouter } from './copy-versions';
import { studioCrossFunctionsRouter } from './cross-functions';
import { studioDashboardRouter } from './dashboard';
import { studioFoundersCohortRouter } from './founders-cohort';
import { studioLandingRouter } from './landing';
import { studioLibraryRouter } from './library';
import { studioListingHealthRouter } from './listing-health';
import { studioMultiFormatRouter } from './multi-format';
import { studioNotificationsRouter } from './notifications';
import { studioOnboardingRouter } from './onboarding';
import { studioProjectsRouter } from './projects';
import { studioPublicGalleryRouter } from './public-gallery';
import { studioRemarketingRouter } from './remarketing';
import { studioStreaksRouter } from './streaks';
import { studioSubscriptionsRouter } from './subscriptions';
import { studioUrlImportRouter } from './url-import';
import { studioUsageRouter } from './usage';
import { studioVoiceClonesRouter } from './voice-clones';
import { studioWaitlistRouter } from './waitlist';

export const studioRouter = router({
  aiCoach: studioAiCoachRouter,
  batchMode: studioBatchModeRouter,
  brandKit: studioBrandKitRouter,
  calendar: studioCalendarRouter,
  challenges: studioChallengesRouter,
  copyPack: studioCopyPackRouter,
  copyVersions: studioCopyVersionsRouter,
  crossFunctions: studioCrossFunctionsRouter,
  dashboard: studioDashboardRouter,
  foundersCohort: studioFoundersCohortRouter,
  landing: studioLandingRouter,
  library: studioLibraryRouter,
  listingHealth: studioListingHealthRouter,
  multiFormat: studioMultiFormatRouter,
  notifications: studioNotificationsRouter,
  onboarding: studioOnboardingRouter,
  projects: studioProjectsRouter,
  publicGallery: studioPublicGalleryRouter,
  remarketing: studioRemarketingRouter,
  streaks: studioStreaksRouter,
  subscriptions: studioSubscriptionsRouter,
  urlImport: studioUrlImportRouter,
  usage: studioUsageRouter,
  voiceClones: studioVoiceClonesRouter,
  waitlist: studioWaitlistRouter,
});
