import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_HEADER,
  splitLocalePath,
} from '@/i18n/config';
import { gotrue } from '@/server/gotrue';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from '@/server/session';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, Content-Type, X-CoopSeat-Client, X-CoopSeat-Version',
  'Access-Control-Max-Age': '600',
};

function expiresSoon(token: string | undefined): boolean {
  if (!token) return true;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString(),
    ) as { exp?: number };
    return !payload.exp || payload.exp * 1000 - Date.now() < 60_000;
  } catch {
    return true;
  }
}

/**
 * `/pt-BR/...` is served by the unprefixed route; the locale travels in a request header.
 * The cookie mirrors that URL so the next API call speaks the same language, without
 * changing what an unprefixed page renders.
 */
function forward(req: NextRequest): NextResponse {
  const localized = splitLocalePath(req.nextUrl.pathname);
  const locale = localized?.locale ?? DEFAULT_LOCALE;
  const headers = new Headers(req.headers);
  if (localized) headers.set(LOCALE_HEADER, locale);
  else headers.delete(LOCALE_HEADER);
  let res: NextResponse;
  if (localized) {
    const url = req.nextUrl.clone();
    url.pathname = localized.path;
    res = NextResponse.rewrite(url, { request: { headers } });
  } else {
    res = NextResponse.next({ request: { headers } });
  }
  if (req.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }
  return res;
}

/**
 * - /api: the desktop app calls cross-origin with Bearer tokens (never cookies), so CORS
 *   is open but credential-less. Cookie requests are protected by the Origin check.
 * - Pages: serves the `/pt-BR` prefix and refreshes the web session cookies shortly before
 *   the access token expires.
 */
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS')
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
    const res = NextResponse.next();
    if (
      req.headers.get('x-coopseat-client') === 'desktop' ||
      req.headers.has('authorization')
    ) {
      for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
    }
    return res;
  }

  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken || !expiresSoon(req.cookies.get(ACCESS_COOKIE)?.value))
    return forward(req);

  try {
    const tokens = await gotrue.refreshGrant(refreshToken);
    req.cookies.set(ACCESS_COOKIE, tokens.access_token);
    req.cookies.set(REFRESH_COOKIE, tokens.refresh_token);
    const res = forward(req);
    setSessionCookies(res, tokens);
    return res;
  } catch {
    req.cookies.delete(ACCESS_COOKIE);
    req.cookies.delete(REFRESH_COOKIE);
    const res = forward(req);
    clearSessionCookies(res);
    return res;
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)',
  ],
};
