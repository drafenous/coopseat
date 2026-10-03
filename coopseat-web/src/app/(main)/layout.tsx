import type { Metadata } from 'next';
import { I18nProvider } from '@/i18n/client';
import { getDictionary, getLocale } from '@/i18n/server';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: { default: 'CoopSeat', template: '%s · CoopSeat' },
    description: t.meta.description,
    metadataBase: new URL(process.env['APP_URL'] ?? 'https://coopseat.com'),
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
