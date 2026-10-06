import type { Metadata, Viewport } from 'next';
import { CookieConsent } from '@/components/CookieConsent';
import { ClickTracking } from '@/components/ClickTracking';
import { GoogleTag } from '@/app/GoogleTag';
import { I18nProvider } from '@/i18n/client';
import { getDictionary, getLocale } from '@/i18n/server';
import { SITE_NAME, SITE_URL, ogImage } from '@/lib/seo';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0b1016',
  colorScheme: 'dark',
};

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const image = ogImage(locale, t.meta.title);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.meta.title, template: `%s · ${SITE_NAME}` },
    description: t.meta.description,
    applicationName: SITE_NAME,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: t.meta.title,
      description: t.meta.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.title,
      description: t.meta.description,
      images: [image],
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className="h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">
        <GoogleTag />
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <CookieConsent locale={locale} />
        <ClickTracking />
      </body>
    </html>
  );
}
