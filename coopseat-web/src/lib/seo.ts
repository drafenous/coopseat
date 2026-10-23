import type { Metadata } from 'next';
import {
  DEFAULT_LOCALE,
  LOCALES,
  localePath,
  type Locale,
} from '@/i18n/config';

export const SITE_URL = process.env['APP_URL'] ?? 'https://coopseat.com';
export const SITE_NAME = 'CoopSeat';

const OG_LOCALES: Record<Locale, string> = { en: 'en_US', 'pt-BR': 'pt_BR' };

/** Pages listed in the sitemap, with hreflang alternates for every locale. */
export const INDEXABLE_PATHS = [
  '/',
  '/download',
  '/play',
  '/privacy',
  '/terms',
  '/contact',
  '/rooms',
] as const;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function ogImage(locale: Locale, alt: string) {
  return { url: `/og/${locale}`, width: 1200, height: 630, alt };
}

export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(LOCALES.map((l) => [l, localePath(l, path)])),
    'x-default': localePath(DEFAULT_LOCALE, path),
  };
}

type PageSeo = {
  locale: Locale;
  /** Unprefixed path, e.g. `/download`. */
  path: string;
  title: string;
  description: string;
  imageAlt: string;
  /** Skips the `%s · CoopSeat` template (home page and the separate /play root layout). */
  absoluteTitle?: boolean;
};

/**
 * Title, description, canonical, hreflang, Open Graph and Twitter card for an indexable page.
 * Metadata merges shallowly, so `openGraph` and `twitter` must be complete here.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  imageAlt,
  absoluteTitle,
}: PageSeo): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const url = localePath(locale, path);
  const image = ogImage(locale, imageAlt);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url,
      locale: OG_LOCALES[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map(
        (l) => OG_LOCALES[l],
      ),
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  };
}

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** JSON-LD for the desktop app; the download page adds the release details. */
export function softwareApplication(
  locale: Locale,
  description: string,
  extra: Record<string, unknown> = {},
) {
  return {
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'GameApplication',
    operatingSystem: 'Windows 10, Windows 11',
    description,
    url: absoluteUrl(localePath(locale, '/')),
    downloadUrl: absoluteUrl(localePath(locale, '/download')),
    image: absoluteUrl(`/og/${locale}`),
    inLanguage: locale,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
    publisher: { '@id': ORGANIZATION_ID },
    ...extra,
  };
}
