import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { AccountForm } from '@/features/settings/components/account-form';

export default async function AccountSettingsPage() {
  const t = await getTranslations('Settings.account');

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
      </header>
      <Suspense fallback={<div className="h-96 rounded-md border" />}>
        <AccountForm />
      </Suspense>
    </main>
  );
}
