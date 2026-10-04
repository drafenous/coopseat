export const LOCALES = ['en', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'locale';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', 'pt-BR': 'Português' };

/** Set by the proxy on `/pt-BR/...` requests; wins over the cookie and Accept-Language. */
export const LOCALE_HEADER = 'x-coopseat-locale';

/**
 * Crawlers send no cookie and usually no Accept-Language, so each non-default locale also gets
 * its own URL prefix; that is what makes the Portuguese pages indexable.
 */
const LOCALE_PREFIXES: Record<Locale, string> = { en: '', 'pt-BR': '/pt-BR' };

export function localePath(locale: Locale, path: string): string {
  const prefix = LOCALE_PREFIXES[locale];
  if (!prefix) return path;
  return path === '/' ? prefix : `${prefix}${path}`;
}

/** Splits `/pt-BR/download` into the locale and the unprefixed path; null when there is no prefix. */
export function splitLocalePath(pathname: string): { locale: Locale; path: string } | null {
  for (const locale of LOCALES) {
    const prefix = LOCALE_PREFIXES[locale];
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return { locale, path: pathname.slice(prefix.length) || '/' };
    }
  }
  return null;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Picks the best supported locale from an Accept-Language header, honoring q-values. */
export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { tag: tag.toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, index };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    if (tag === 'pt' || tag.startsWith('pt-')) return 'pt-BR';
    if (tag === 'en' || tag.startsWith('en-')) return 'en';
  }
  return DEFAULT_LOCALE;
}

export function resolveLocale(cookie: string | null | undefined, acceptLanguage: string | null | undefined): Locale {
  return isLocale(cookie) ? cookie : matchLocale(acceptLanguage);
}
