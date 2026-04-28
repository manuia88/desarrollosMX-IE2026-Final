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
import { socialPublishersRouter } from './social-publishers';
import { studioSpeechAnalyticsRouter } from './speech-analytics';
import {
  studioSprint6CinemaModeRouter,
  studioSprint6DroneRouter,
  studioSprint6SeedanceRouter,
  studioSprint6TogglesRouter,
  studioSprint6VirtualStagingRouter,
} from './sprint6';
import { studioSprint7AnalyticsRouter } from './sprint7-analytics';
import { studioSprint7AvatarsRouter } from './sprint7-avatars';
import { studioSprint7GalleryAnalyticsRouter } from './sprint7-gallery-analytics';
import { studioSprint7PublicGalleryRouter } from './sprint7-public-gallery';
import { studioSprint7ZoneVideosRouter } from './sprint7-zone-videos';
import { studioSprint8PublicSeriesRouter } from './sprint8-public-series';
import { studioSprint8SeriesRouter } from './sprint8-series';
import { studioSprint9PhotographerRouter } from './sprint9-photographer';
import {
  sprint10FeedbackRouter,
  sprint10HealthCheckRouter,
  sprint10QaReportRouter,
} from './sprint10';
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
  cinemaMode: studioSprint6CinemaModeRouter,
  copyPack: studioCopyPackRouter,
  copyVersions: studioCopyVersionsRouter,
  crossFunctions: studioCrossFunctionsRouter,
  cuts: studioCutsRouter,
  dashboard: studioDashboardRouter,
  drone: studioSprint6DroneRouter,
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
  seedance: studioSprint6SeedanceRouter,
  socialPublishers: socialPublishersRouter,
  speechAnalytics: studioSpeechAnalyticsRouter,
  sprint6Toggles: studioSprint6TogglesRouter,
  sprint7Analytics: studioSprint7AnalyticsRouter,
  sprint7Avatars: studioSprint7AvatarsRouter,
  sprint7GalleryAnalytics: studioSprint7GalleryAnalyticsRouter,
  sprint7PublicGallery: studioSprint7PublicGalleryRouter,
  sprint7ZoneVideos: studioSprint7ZoneVideosRouter,
  sprint8PublicSeries: studioSprint8PublicSeriesRouter,
  sprint8Series: studioSprint8SeriesRouter,
  sprint9Photographer: studioSprint9PhotographerRouter,
  sprint10Feedback: sprint10FeedbackRouter,
  sprint10HealthCheck: sprint10HealthCheckRouter,
  sprint10QaReport: sprint10QaReportRouter,
  streaks: studioStreaksRouter,
  subscriptions: studioSubscriptionsRouter,
  subtitles: studioSubtitlesRouter,
  urlImport: studioUrlImportRouter,
  usage: studioUsageRouter,
  virtualStaging: studioSprint6VirtualStagingRouter,
  voiceClones: studioVoiceClonesRouter,
  waitlist: studioWaitlistRouter,
});
