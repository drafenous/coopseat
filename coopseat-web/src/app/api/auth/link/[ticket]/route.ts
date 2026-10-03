import { NextResponse, type NextRequest } from 'next/server';
import { pkceChallenge, randomToken } from '@/server/crypto';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { setOAuthState } from '@/server/oauth-state';
import { consumeTicket, type LinkPayload } from '@/server/tickets';

type Ctx = { params: Promise<{ ticket: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { ticket } = await ctx.params;
  const payload = await consumeTicket<LinkPayload>(ticket, 'link');
  const fail = (code: 'link_expired' | 'link_failed') =>
    NextResponse.redirect(new URL(`/auth/error?code=${code}`, env.appUrl), 303);

  if (!payload) return fail('link_expired');

  const verifier = randomToken(48);
  try {
    const { url } = await gotrue.linkIdentityUrl(
      payload.accessToken,
      payload.provider,
      `${env.appUrl}/api/auth/callback`,
      pkceChallenge(verifier),
    );
    const res = NextResponse.redirect(url, 303);
    setOAuthState(res, { verifier, mode: payload.mode });
    return res;
  } catch {
    return fail('link_failed');
  }
}
