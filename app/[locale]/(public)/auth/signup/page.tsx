import { headers } from 'next/headers';
import { Suspense } from 'react';
import { SignupForm } from '@/features/auth/components/signup-form';

async function SignupFormWithGeo() {
  const hdrs = await headers();
  const geoTimezone = hdrs.get('x-vercel-ip-timezone');
  return <SignupForm geoTimezoneHint={geoTimezone} />;
}

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <Suspense fallback={<SignupForm />}>
        <SignupFormWithGeo />
      </Suspense>
    </main>
  );
}
