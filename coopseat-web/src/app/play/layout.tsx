import type { Metadata, Viewport } from 'next';
import { CookieConsent } from '@/components/CookieConsent';
import { GoogleTag } from '@/app/GoogleTag';
import { getDictionary, getLocale } from '@/i18n/server';
import { SITE_NAME, SITE_URL, pageMetadata } from '@/lib/seo';
import './play.css';

export const viewport: Viewport = { themeColor: '#0b1016', colorScheme: 'dark' };

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    ...pageMetadata({
      locale,
      path: '/play',
      title: `${t.meta.play} · ${SITE_NAME}`,
      description: t.meta.playDescription,
      imageAlt: t.meta.title,
      absoluteTitle: true,
    }),
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
