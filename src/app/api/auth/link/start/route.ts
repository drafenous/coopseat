import { NextResponse } from 'next/server';
import { z } from 'zod';
import { oauthProviderSchema } from '@/lib/validation/account';
import { env } from '@/server/env';
import { readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth } from '@/server/session';
import { createTicket, type LinkPayload } from '@/server/tickets';

const bodySchema = z.object({ provider: oauthProviderSchema });

/** Returns a one-time URL that the browser opens to link a provider to the signed-in account. */
export const POST = route(async (req) => {
  const session = await requireAuth(req, { aal2IfEnrolled: true });
  await rateLimit('oauth', session.claims.sub);
  const { provider } = await readJson(req, bodySchema);
  const payload: LinkPayload = {
    accessToken: session.token,
    provider,
    mode: session.mode === 'bearer' ? 'link-desktop' : 'link-web',
  };
  const ticket = await createTicket('link', payload);
  return NextResponse.json({ url: `${env.appUrl}/api/auth/link/${ticket}` });
});
