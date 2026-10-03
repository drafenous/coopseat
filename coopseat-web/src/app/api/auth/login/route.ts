import { NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validation/account';
import { auth } from '@/server/auth-errors';
import { verifyCaptcha } from '@/server/captcha';
import { gotrue } from '@/server/gotrue';
import { clientIp, readJson, route } from '@/server/http';
import { hasVerifiedFactor, sealMfaToken, setMfaCookie, verifiedFactors } from '@/server/oauth-state';
import { ensureProfile } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';
import { assertSameOrigin, isDesktop, sessionResponse } from '@/server/session';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit('login', ip);
  const input = await readJson(req, loginSchema);
  await rateLimit('login', input.email);
  // Turnstile can't run on the desktop's file:// origin; desktop logins rely on the rate limits above.
  if (!isDesktop(req)) await verifyCaptcha(input.captchaToken, ip);

  const tokens = await auth(gotrue.passwordGrant(input.email, input.password));
  await ensureProfile(tokens.user.id);

  if (hasVerifiedFactor(tokens)) {
    const body = { mfaRequired: true, factors: verifiedFactors(tokens) };
    if (isDesktop(req)) return NextResponse.json({ ...body, mfaToken: sealMfaToken(tokens) });
    const res = NextResponse.json(body);
    setMfaCookie(res, tokens);
    return res;
  }
  return sessionResponse(req, tokens, { ok: true });
});
