import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pkceVerifierSchema } from '@/lib/validation/account';
import type { AuthTokens } from '@/server/gotrue';
import { ApiError, clientIp, readJson, route } from '@/server/http';
import { verifiedFactors } from '@/server/oauth-state';
import { unsealMfaToken } from '@/server/oauth-state';
import { rateLimit } from '@/server/rate-limit';
import { desktopSession } from '@/server/session';
import { consumeTicket } from '@/server/tickets';

const bodySchema = z.object({ ticket: z.string().max(64), verifier: pkceVerifierSchema });

type Payload = { tokens: AuthTokens } | { mfaRequired: true; mfaToken: string };

export const POST = route(async (req) => {
  await rateLimit('exchange', clientIp(req));
  const { ticket, verifier } = await readJson(req, bodySchema);
  const payload = await consumeTicket<Payload>(ticket, 'desktop_login', verifier);
  if (!payload) throw new ApiError(400, 'ticket_invalid');

  if ('mfaRequired' in payload) {
    const tokens = unsealMfaToken(payload.mfaToken);
    return NextResponse.json({
      mfaRequired: true,
      mfaToken: payload.mfaToken,
      factors: tokens ? verifiedFactors(tokens) : [],
    });
  }
  return NextResponse.json({ session: desktopSession(payload.tokens) });
});
