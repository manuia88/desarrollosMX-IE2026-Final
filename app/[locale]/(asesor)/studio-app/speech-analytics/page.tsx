// F14.F.6 Sprint 5 BIBLIA LATERAL 6 — Speech analytics page.

import { SpeechAnalyticsDashboard } from '@/features/dmx-studio/components/raw-video/SpeechAnalyticsDashboard';
import { requireStudioOnboardingComplete } from '@/features/dmx-studio/lib/onboarding-gate';

interface SpeechAnalyticsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SpeechAnalyticsPageRoute({ params }: SpeechAnalyticsPageProps) {
  const { locale } = await params;
  await requireStudioOnboardingComplete(locale);

  return (
    <main
      aria-label="Speech analytics"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <SpeechAnalyticsDashboard />
    </main>
  );
}
