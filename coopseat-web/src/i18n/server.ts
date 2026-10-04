import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, LOCALE_HEADER, isLocale, resolveLocale, type Locale } from './config';
import { dictionaries } from './dictionaries';

/** Locale for Server Components and Server Actions: URL prefix, then cookie, then Accept-Language. */
export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const fromPath = headerList.get(LOCALE_HEADER);
  if (isLocale(fromPath)) return fromPath;
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerList.get('accept-language'));
}

export async function getDictionary() {
  return dictionaries[await getLocale()];
}

/** Locale for Route Handlers. The desktop app sends no cookies, only Accept-Language. */
export function localeFromRequest(req: Request): Locale {
  const fromPath = req.headers.get(LOCALE_HEADER);
  if (isLocale(fromPath)) return fromPath;
  const cookie = req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`))?.[1];
  return resolveLocale(cookie ? decodeURIComponent(cookie) : null, req.headers.get('accept-language'));
}

export function dictionaryFor(req: Request) {
  return dictionaries[localeFromRequest(req)];
}
