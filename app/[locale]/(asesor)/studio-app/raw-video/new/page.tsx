// F14.F.6 Sprint 5 BIBLIA Tarea 5.1 — Raw video upload route.

import { RawVideoUploadFlow } from '@/features/dmx-studio/components/raw-video/RawVideoUploadFlow';
import { requireStudioOnboardingComplete } from '@/features/dmx-studio/lib/onboarding-gate';

interface RawVideoNewPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from_operacion?: string }>;
}

export default async function RawVideoNewPageRoute({ params, searchParams }: RawVideoNewPageProps) {
  const { locale } = await params;
  const { from_operacion } = await searchParams;
  await requireStudioOnboardingComplete(locale);

  return (
    <main
      aria-label="Subir video crudo"
      className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col gap-8 px-6 py-10"
      style={{ background: 'var(--canon-bg)', color: 'var(--canon-cream)' }}
    >
      <RawVideoUploadFlow
        locale={locale}
        {...(from_operacion ? { fromOperacionId: from_operacion } : {})}
      />
    </main>
  );
}
