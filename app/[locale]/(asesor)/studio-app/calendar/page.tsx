// F14.F.5 Sprint 4 — DMX Studio Calendar IA (RSC entry).
// Auth + studio onboarding gate validados. Renderiza CalendarPage client component
// que consume tRPC studio.calendar.*.

import { CalendarPage } from '@/features/dmx-studio/components/calendar/CalendarPage';
import { requireStudioOnboardingComplete } from '@/features/dmx-studio/lib/onboarding-gate';

interface StudioCalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function StudioCalendarPageRoute({ params }: StudioCalendarPageProps) {
  const { locale } = await params;
  await requireStudioOnboardingComplete(locale);

  return (
    <main
      aria-label="Calendario IA"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <CalendarPage locale={locale} />
    </main>
  );
}
