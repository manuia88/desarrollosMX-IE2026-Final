import { headers } from 'next/headers';
import { SignupForm } from '@/features/auth/components/signup-form';

export default async function SignupPage() {
  const hdrs = await headers();
  const geoTimezone = hdrs.get('x-vercel-ip-timezone');

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <SignupForm geoTimezoneHint={geoTimezone} />
    </main>
  );
}
