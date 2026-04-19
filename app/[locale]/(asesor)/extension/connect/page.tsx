import { redirect } from 'next/navigation';
import { ExtensionConnectForm } from '@/features/market/components/extension-connect-form';
import { createClient } from '@/shared/lib/supabase/server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ExtensionConnectPage({ params }: PageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login?redirect=/extension/connect`);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Conectar Chrome Extension</h1>
        <p className="text-muted-foreground">
          Autoriza tu navegador para capturar listings desde Inmuebles24, Vivanuncios,
          Propiedades.com, ML Inmuebles y FB Marketplace hacia tu cuenta DMX.
        </p>
      </header>
      <ExtensionConnectForm />
    </main>
  );
}
