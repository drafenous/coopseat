import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/server/env';
import { startGoogleOAuth } from '@/server/oauth-state';
import { consumeTicket, type LinkPayload } from '@/server/tickets';

type Ctx = { params: Promise<{ ticket: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { ticket } = await ctx.params;
  const payload = await consumeTicket<LinkPayload>(ticket, 'link');
  const fail = (code: 'link_expired' | 'link_failed') =>
    NextResponse.redirect(new URL(`/auth/error?code=${code}`, env.appUrl), 303);

  if (!payload) return fail('link_expired');

  try {
    return startGoogleOAuth({ mode: payload.mode, linkTo: payload.accessToken });
  } catch {
    return fail('link_failed');
  }
}
