import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { IePlaygroundClient } from './ie-playground-client';

export default async function IePlaygroundPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const messages = (await import('@/messages/es-MX.json')).default;
  return (
    <NextIntlClientProvider locale="es-MX" messages={messages}>
      <IePlaygroundClient />
    </NextIntlClientProvider>
  );
}
