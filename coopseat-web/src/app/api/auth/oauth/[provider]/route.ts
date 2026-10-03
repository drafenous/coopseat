import { NextResponse, type NextRequest } from 'next/server';
import { oauthProviderSchema, pkceChallengeSchema } from '@/lib/validation/account';
import { pkceChallenge, randomToken } from '@/server/crypto';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { clientIp, errorResponse, safeNextPath } from '@/server/http';
import { setOAuthState } from '@/server/oauth-state';
import { rateLimit } from '@/server/rate-limit';

type Ctx = { params: Promise<{ provider: string }> };

/**
 * Starts an OAuth sign-in. Web: `/api/auth/oauth/google?next=/conta`.
 * Desktop: `/api/auth/oauth/google?client=desktop&challenge=<S256 of the app's verifier>`.
 */
export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const provider = oauthProviderSchema.parse((await ctx.params).provider);
    await rateLimit('oauth', clientIp(req));

    const params = req.nextUrl.searchParams;
    const desktop = params.get('client') === 'desktop';
    const desktopChallenge = desktop ? pkceChallengeSchema.parse(params.get('challenge')) : undefined;

    const verifier = randomToken(48);
    const url = gotrue.authorizeUrl(provider, `${env.appUrl}/api/auth/callback`, pkceChallenge(verifier));
    const res = NextResponse.redirect(url, 303);
    setOAuthState(res, {
      verifier,
      mode: desktop ? 'desktop' : 'web',
      next: desktop ? undefined : safeNextPath(params.get('next')),
      desktopChallenge,
    });
    return res;
  } catch (err) {
    const res = errorResponse(err);
    const message = encodeURIComponent('Não foi possível iniciar o login com esse provedor.');
    return NextResponse.redirect(new URL(`/auth/erro?status=${res.status}&mensagem=${message}`, env.appUrl), 303);
  }
}
