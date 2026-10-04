import type { MetadataRoute } from 'next';
import { LOCALES, localePath } from '@/i18n/config';
import { absoluteUrl } from '@/lib/seo';

/** Private and flow pages also carry `noindex`; these paths have nothing a crawler should fetch. */
const PRIVATE_PATHS = ['/account', '/verification/', '/auth/', '/download/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', ...LOCALES.flatMap((locale) => PRIVATE_PATHS.map((path) => localePath(locale, path)))],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
