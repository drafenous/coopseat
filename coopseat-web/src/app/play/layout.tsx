import type { Metadata } from 'next';
import { CookieConsent } from '@/components/CookieConsent';
import { GoogleTag } from '@/app/GoogleTag';
import { getDictionary, getLocale } from '@/i18n/server';
import './play.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: `${t.meta.play} · CoopSeat`,
    description: t.meta.playDescription,
    metadataBase: new URL(process.env['APP_URL'] ?? 'https://coopseat.com'),
  };
}

/** Separate root layout: the app's element defaults (base.css) must not leak into the site. */
export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <GoogleTag />
        {children}
        <CookieConsent locale={locale} />
      </body>
    </html>
  );
}
