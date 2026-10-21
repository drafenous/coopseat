import { NextResponse } from 'next/server';
import { dictionaryFor } from '@/i18n/server';
import { forgotSchema } from '@/lib/validation/account';
import { verifyCaptcha } from '@/server/captcha';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { clientIp, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { assertSameOrigin } from '@/server/session';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit('forgot', ip);
  const input = await readJson(req, forgotSchema);
  await verifyCaptcha(input.captchaToken, ip);
  await rateLimit('forgot', input.email);
  await gotrue
    .resendSignup(input.email, `${env.appUrl}/api/auth/confirm?flow=signup`)
    .catch(() => undefined);
  return NextResponse.json({ message: dictionaryFor(req).messages.resendSent });
});
