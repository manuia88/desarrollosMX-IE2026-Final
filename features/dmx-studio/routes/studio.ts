import { router } from '@/server/trpc/init';
import { studioBrandKitRouter } from './brand-kit';
import { studioFoundersCohortRouter } from './founders-cohort';
import { studioLandingRouter } from './landing';
import { studioPublicGalleryRouter } from './public-gallery';
import { studioSubscriptionsRouter } from './subscriptions';
import { studioWaitlistRouter } from './waitlist';

export const studioRouter = router({
  brandKit: studioBrandKitRouter,
  foundersCohort: studioFoundersCohortRouter,
  landing: studioLandingRouter,
  publicGallery: studioPublicGalleryRouter,
  subscriptions: studioSubscriptionsRouter,
  waitlist: studioWaitlistRouter,
});
