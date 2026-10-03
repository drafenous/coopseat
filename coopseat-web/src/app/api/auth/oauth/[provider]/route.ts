import { NextResponse, type NextRequest } from 'next/server';
import { oauthProviderSchema, pkceChallengeSchema } from '@/lib/validation/account';
import { env } from '@/server/env';
import { clientIp, errorResponse, safeNextPath } from '@/server/http';
import { startGoogleOAuth } from '@/server/oauth-state';
import { rateLimit } from '@/server/rate-limit';

type Ctx = { params: Promise<{ provider: string }> };

/**
 * Starts an OAuth sign-in. Web: `/api/auth/oauth/google?next=/account`.
 * Desktop: `/api/auth/oauth/google?client=desktop&challenge=<S256 of the app's verifier>`.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    oauthProviderSchema.parse((await ctx.params).provider);
    await rateLimit('oauth', clientIp(req));

    const params = req.nextUrl.searchParams;
    const desktop = params.get('client') === 'desktop';
    const desktopChallenge = desktop ? pkceChallengeSchema.parse(params.get('challenge')) : undefined;

    return startGoogleOAuth({
      mode: desktop ? 'desktop' : 'web',
      next: desktop ? undefined : safeNextPath(params.get('next')),
      desktopChallenge,
    });
  } catch (err) {
    const res = errorResponse(err);
    return NextResponse.redirect(new URL(`/auth/error?status=${res.status}&code=oauth_start_failed`, env.appUrl), 303);
  }
}
