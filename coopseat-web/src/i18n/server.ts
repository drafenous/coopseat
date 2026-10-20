import { headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  isLocale,
  resolveLocale,
  type Locale,
} from './config';
import { dictionaries } from './dictionaries';

/**
 * Locale for pages. The URL is the only signal: `/pt-BR/...` via the proxy header, otherwise
 * English. A cookie or Accept-Language must not change the HTML of an unprefixed URL.
 */
export async function getLocale(): Promise<Locale> {
  const fromPath = (await headers()).get(LOCALE_HEADER);
  return isLocale(fromPath) ? fromPath : DEFAULT_LOCALE;
}

export async function getDictionary() {
  return dictionaries[await getLocale()];
}

/** Locale for Route Handlers. The desktop app sends no cookies, only Accept-Language. */
export function localeFromRequest(req: Request): Locale {
  const fromPath = req.headers.get(LOCALE_HEADER);
  if (isLocale(fromPath)) return fromPath;
  const cookie = req.headers
    .get('cookie')
    ?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`))?.[1];
  return resolveLocale(
    cookie ? decodeURIComponent(cookie) : null,
    req.headers.get('accept-language'),
  );
}

export function dictionaryFor(req: Request) {
  return dictionaries[localeFromRequest(req)];
}
