import { NextResponse } from 'next/server';
import { signupSchema, TERMS_VERSION } from '@/lib/validation/account';
import { auth } from '@/server/auth-errors';
import { verifyCaptcha } from '@/server/captcha';
import { env } from '@/server/env';
import { gotrue, type AuthTokens, type AuthUser } from '@/server/gotrue';
import { ApiError, clientIp, readJson, route } from '@/server/http';
import { acceptTerms, isNicknameAvailable, setNickname } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';
import { assertSameOrigin } from '@/server/session';

const SENT = { status: 'confirmation_sent', message: 'Enviamos um link de confirmação para o seu e-mail.' };

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit('signup', ip);
  const input = await readJson(req, signupSchema);
  await verifyCaptcha(input.captchaToken, ip);

  if (!(await isNicknameAvailable(input.nickname))) {
    throw new ApiError(409, 'nickname_taken', 'Esse apelido já está em uso.');
  }

  const result = await auth(
    gotrue.signUp(input.email, input.password, `${env.appUrl}/api/auth/confirm?flow=signup`, {
      nickname: input.nickname,
      terms_version: TERMS_VERSION,
    }),
  );
  const user: AuthUser = 'access_token' in result ? (result as AuthTokens).user : (result as AuthUser);

  // With email confirmation on, an existing email yields an obfuscated user without
  // identities. Answer the same way so the endpoint does not reveal registered emails.
  if (!user.identities || user.identities.length === 0) {
    return NextResponse.json(SENT, { status: 201 });
  }

  try {
    await setNickname(user.id, input.nickname, { enforceCooldown: false });
    await acceptTerms(user.id, TERMS_VERSION);
  } catch (err) {
    await gotrue.admin.deleteUser(user.id).catch((e) => console.error('rollback signup failed', e));
    throw err;
  }

  return NextResponse.json(SENT, { status: 201 });
});
