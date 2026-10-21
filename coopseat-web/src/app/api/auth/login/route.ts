import { NextResponse } from 'next/server';
import { loginSchema, pkceChallengeSchema } from '@/lib/validation/account';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { verifyCaptcha } from '@/server/captcha';
import { gotrue } from '@/server/gotrue';
import { ApiError, clientIp, readJson, route } from '@/server/http';
import {
  hasVerifiedFactor,
  sealMfaToken,
  setMfaCookie,
  verifiedFactors,
} from '@/server/oauth-state';
import { ensureProfile } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';
import { assertSameOrigin, isDesktop, sessionResponse } from '@/server/session';
import { createTicket } from '@/server/tickets';

export const POST = route((req) =>
  withAuthDb(async () => {
    assertSameOrigin(req);
    const ip = clientIp(req);
    await rateLimit('login', ip);
    const input = await readJson(req, loginSchema);
    await verifyCaptcha(input.captchaToken, ip);

    let tokens;
    try {
      tokens = await auth(gotrue.passwordGrant(input.email, input.password));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid_credentials')
        await rateLimit('login', input.email);
      throw err;
    }
    await rateLimit('login', input.email);
    await ensureProfile(tokens.user.id);

    const challenge = input.desktopChallenge
      ? pkceChallengeSchema.parse(input.desktopChallenge)
      : undefined;
    if (challenge) {
      const payload = hasVerifiedFactor(tokens)
        ? { mfaRequired: true, mfaToken: sealMfaToken(tokens) }
        : { tokens };
      const ticket = await createTicket('desktop_login', payload, challenge);
      const to = `coopseat://auth/callback?ticket=${ticket}`;
      return NextResponse.json({
        openApp: `/auth/open-app?to=${encodeURIComponent(to)}`,
      });
    }

    if (hasVerifiedFactor(tokens)) {
      const body = { mfaRequired: true, factors: verifiedFactors(tokens) };
      if (isDesktop(req))
        return NextResponse.json({ ...body, mfaToken: sealMfaToken(tokens) });
      const res = NextResponse.json(body);
      setMfaCookie(res, tokens);
      return res;
    }
    return sessionResponse(req, tokens, { ok: true });
  }),
);
