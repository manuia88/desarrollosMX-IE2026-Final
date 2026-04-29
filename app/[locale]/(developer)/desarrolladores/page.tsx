import { redirect } from 'next/navigation';

interface RouteProps {
  params: Promise<{ locale: string }>;
}

export default async function DeveloperRootRoute({ params }: RouteProps) {
  const { locale } = await params;
  redirect(`/${locale}/desarrolladores/dashboard`);
}
