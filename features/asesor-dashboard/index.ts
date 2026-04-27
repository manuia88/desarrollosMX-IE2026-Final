export type { ActivityItem } from './components/daily-standup/ActivityFeed';
export { ActivityFeed } from './components/daily-standup/ActivityFeed';
export type { MorningBriefingProps } from './components/daily-standup/MorningBriefing';
export { MorningBriefing } from './components/daily-standup/MorningBriefing';
export type { AgendaEvent, TodayAgendaProps } from './components/daily-standup/TodayAgenda';
export { TodayAgenda } from './components/daily-standup/TodayAgenda';
export type { HeroPulseProps } from './components/HeroPulse';
export { HeroPulse } from './components/HeroPulse';
export type { KpiStripProps } from './components/KpiStrip';
export { KpiStrip } from './components/KpiStrip';
export type { PipelineCarouselProps } from './components/PipelineCarousel';
export { PipelineCarousel } from './components/PipelineCarousel';
export type { BadgeItem, BadgesRowProps } from './components/performance-today/BadgesRow';
export { BadgesRow } from './components/performance-today/BadgesRow';
export type {
  Recommendation,
  SmartRecommendationsProps,
} from './components/performance-today/SmartRecommendations';
export { SmartRecommendations } from './components/performance-today/SmartRecommendations';
export type { StreakWidgetProps } from './components/performance-today/StreakWidget';
export { StreakWidget } from './components/performance-today/StreakWidget';
export type { XpProgressBarProps } from './components/performance-today/XpProgressBar';
export { XpProgressBar } from './components/performance-today/XpProgressBar';
export type { StudioCalendarWidgetProps } from './components/StudioCalendarWidget';
export { StudioCalendarWidget } from './components/StudioCalendarWidget';
export type { StudioVideosWidgetProps } from './components/StudioVideosWidget';
export { StudioVideosWidget } from './components/StudioVideosWidget';
export type { DashboardSummary } from './lib/dashboard-loader';
export { loadDashboardSummary } from './lib/dashboard-loader';
export {
  deriveAllKpis,
  deriveMood,
  deriveStreak,
  pipelineDaysProjection,
} from './lib/derive';
export {
  deriveStudioMetrics,
  fetchStudioMetricsForUser,
  type StudioMetricsSummary,
} from './lib/studio-metrics';
