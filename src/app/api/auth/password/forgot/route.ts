import { NextResponse } from 'next/server';
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
  await rateLimit('forgot', input.email);
  await verifyCaptcha(input.captchaToken, ip);
  await gotrue.recover(input.email, `${env.appUrl}/api/auth/confirm`).catch((err) => {
    console.warn('recover failed', err instanceof Error ? err.message : err);
  });
  return NextResponse.json({ message: 'Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.' });
});
