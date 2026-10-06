import type { Metadata, Viewport } from 'next';
import { CookieConsent } from '@/components/CookieConsent';
import { GoogleTag } from '@/app/GoogleTag';
import { getDictionary, getLocale } from '@/i18n/server';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import '../../play/play.css';

export const viewport: Viewport = {
  themeColor: '#0b1016',
  colorScheme: 'dark',
};

export async function generateMetadata({
  params,
}: LayoutProps<'/party/[nickname]'>): Promise<Metadata> {
  const [t, { nickname }] = await Promise.all([getDictionary(), params]);
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    title: `${t.party.title(nickname)} · ${SITE_NAME}`,
    // Rooms are private: never indexed, and the URL must not leak through referrers.
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/** Same isolated root layout as /play: the app's element defaults must not leak into the site. */
export default async function PartyLayout({
  children,
}: LayoutProps<'/party/[nickname]'>) {
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
