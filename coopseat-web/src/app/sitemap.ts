import type { MetadataRoute } from 'next';
import { LOCALES, localePath } from '@/i18n/config';
import { INDEXABLE_PATHS, absoluteUrl, languageAlternates } from '@/lib/seo';

const PRIORITY: Partial<Record<(typeof INDEXABLE_PATHS)[number], number>> = { '/': 1, '/download': 0.9, '/play': 0.7 };

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.flatMap((path) => {
    const languages = Object.fromEntries(Object.entries(languageAlternates(path)).map(([lang, href]) => [lang, absoluteUrl(href)]));
    return LOCALES.map((locale): MetadataRoute.Sitemap[number] => ({
      url: absoluteUrl(localePath(locale, path)),
      changeFrequency: path === '/' || path === '/download' ? 'weekly' : 'monthly',
      priority: PRIORITY[path] ?? 0.4,
      alternates: { languages },
    }));
  });
}
