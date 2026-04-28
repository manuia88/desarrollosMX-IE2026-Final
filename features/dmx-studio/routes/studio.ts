import { router } from '@/server/trpc/init';
import { studioAiCoachRouter } from './ai-coach';
import { studioBatchModeRouter } from './batch-mode';
import { studioBrandKitRouter } from './brand-kit';
import { studioCalendarRouter } from './calendar';
import { studioChallengesRouter } from './challenges';
import { studioCopyPackRouter } from './copy-pack';
import { studioCopyVersionsRouter } from './copy-versions';
import { studioCrossFunctionsRouter } from './cross-functions';
import { studioCutsRouter } from './cuts';
import { studioDashboardRouter } from './dashboard';
import { studioEdlRouter } from './edl';
import { studioFoundersCohortRouter } from './founders-cohort';
import { studioHighlightReelsRouter } from './highlight-reels';
import { studioLandingRouter } from './landing';
import { studioLibraryRouter } from './library';
import { studioListingHealthRouter } from './listing-health';
import { studioMultiFormatRouter } from './multi-format';
import { studioNotificationsRouter } from './notifications';
import { studioOnboardingRouter } from './onboarding';
import { studioProjectsRouter } from './projects';
import { studioPublicGalleryRouter } from './public-gallery';
import { studioRawVideoPipelineRouter } from './raw-video-pipeline';
import { studioRawVideosRouter } from './raw-videos';
import { studioRemarketingRouter } from './remarketing';
import { studioSpeechAnalyticsRouter } from './speech-analytics';
import { studioStreaksRouter } from './streaks';
import { studioSubscriptionsRouter } from './subscriptions';
import { studioSubtitlesRouter } from './subtitles';
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
  cuts: studioCutsRouter,
  dashboard: studioDashboardRouter,
  edl: studioEdlRouter,
  foundersCohort: studioFoundersCohortRouter,
  highlightReels: studioHighlightReelsRouter,
  landing: studioLandingRouter,
  library: studioLibraryRouter,
  listingHealth: studioListingHealthRouter,
  multiFormat: studioMultiFormatRouter,
  notifications: studioNotificationsRouter,
  onboarding: studioOnboardingRouter,
  projects: studioProjectsRouter,
  publicGallery: studioPublicGalleryRouter,
  rawVideoPipeline: studioRawVideoPipelineRouter,
  rawVideos: studioRawVideosRouter,
  remarketing: studioRemarketingRouter,
  speechAnalytics: studioSpeechAnalyticsRouter,
  streaks: studioStreaksRouter,
  subscriptions: studioSubscriptionsRouter,
  subtitles: studioSubtitlesRouter,
  urlImport: studioUrlImportRouter,
  usage: studioUsageRouter,
  voiceClones: studioVoiceClonesRouter,
  waitlist: studioWaitlistRouter,
});
