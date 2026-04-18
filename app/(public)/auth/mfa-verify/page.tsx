'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MfaVerify } from '@/features/auth/components/mfa-verify';

function MfaVerifyInner() {
  const searchParams = useSearchParams();
  const factorId = searchParams.get('factor');
  if (!factorId) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }
  return <MfaVerify factorId={factorId} />;
}

export default function MfaVerifyPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <Suspense fallback={<div>Cargando…</div>}>
        <MfaVerifyInner />
      </Suspense>
    </main>
  );
}
