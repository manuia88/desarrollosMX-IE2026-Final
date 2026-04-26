import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ApiKeysManager } from '@/features/api-v1/components/api-keys-manager';
import { type ListedKey, listKeysDataSchema } from '@/features/api-v1/schemas/keys';
import { createClient } from '@/shared/lib/supabase/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ApiKeysPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations('ApiKeys');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/dashboard/api-keys`);
  }

  const { data } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at')
    .order('created_at', { ascending: false })
    .limit(200);

  const normalized = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    key_prefix: row.key_prefix,
    scopes: Array.isArray(row.scopes)
      ? row.scopes.filter((s): s is string => typeof s === 'string')
      : [],
    created_at: row.created_at,
    last_used_at: row.last_used_at,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
  }));

  const parsed = listKeysDataSchema.safeParse({ items: normalized });
  const initialKeys: readonly ListedKey[] = parsed.success ? parsed.data.items : [];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 id="api-keys-title" className="text-2xl font-semibold">
          {t('pageTitle')}
        </h1>
        <p className="text-sm text-neutral-600">{t('pageBody')}</p>
      </header>
      <ApiKeysManager initialKeys={initialKeys} />
    </main>
  );
}
