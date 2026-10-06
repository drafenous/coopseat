import { z } from 'zod';
import { localeFromRequest } from '@/i18n/server';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, errorResponse, route } from '@/server/http';
import {
  REFRESH_COOKIE,
  assertSameOrigin,
  clearSessionCookies,
  isDesktop,
  sessionResponse,
} from '@/server/session';

const bodySchema = z.object({ refreshToken: z.string().min(1).max(512) });

export const POST = route(async (req) => {
  assertSameOrigin(req);
  let refreshToken: string | undefined;
  if (isDesktop(req)) {
    refreshToken = bodySchema.parse(
      await req.json().catch(() => ({})),
    ).refreshToken;
  } else {
    refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  }
  if (!refreshToken) throw new ApiError(401, 'unauthenticated');

  try {
    const tokens = await auth(gotrue.refreshGrant(refreshToken));
    return sessionResponse(req, tokens, { ok: true });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !isDesktop(req)) {
      const res = errorResponse(err, localeFromRequest(req));
      clearSessionCookies(res);
      return res;
    }
    throw err;
  }
});
