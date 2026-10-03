import { NextResponse } from 'next/server';
import { deleteMeSchema, TERMS_VERSION, updateMeSchema } from '@/lib/validation/account';
import { accountSummary } from '@/server/account';
import { auth } from '@/server/auth-errors';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { ApiError, readJson, route } from '@/server/http';
import { acceptTerms, getProfile, setNickname } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';
import { clearSessionCookies, requireAuth } from '@/server/session';

export const GET = route(async (req) => {
  const session = await requireAuth(req);
  const user = await auth(gotrue.getUser(session.token));
  return NextResponse.json(await accountSummary(user, session.claims));
});

export const PATCH = route(async (req) => {
  const input = await readJson(req, updateMeSchema);
  const session = await requireAuth(req, { aal2IfEnrolled: input.email !== undefined });
  await rateLimit('account', session.claims.sub);

  let message: string | undefined;
  if (input.nickname !== undefined) {
    await setNickname(session.claims.sub, input.nickname, { enforceCooldown: true });
  }
  if (input.acceptTerms) await acceptTerms(session.claims.sub, TERMS_VERSION);
  if (input.email !== undefined) {
    await auth(gotrue.updateUser(session.token, { email: input.email }, `${env.appUrl}/api/auth/confirm`));
    message = 'Enviamos um link de confirmação para o novo e-mail.';
  }

  const user = await auth(gotrue.getUser(session.token));
  return NextResponse.json({ ...(await accountSummary(user, session.claims)), message });
});

export const DELETE = route(async (req) => {
  const session = await requireAuth(req, { aal2IfEnrolled: true });
  await rateLimit('account', session.claims.sub);
  const { confirm } = await readJson(req, deleteMeSchema);

  const profile = await getProfile(session.claims.sub);
  const expected = profile?.nickname ?? session.claims.email ?? '';
  if (!expected || confirm.trim().toLowerCase() !== expected.toLowerCase()) {
    throw new ApiError(400, 'confirm_mismatch', 'Digite seu apelido exatamente como aparece para confirmar.');
  }

  // Profile, verifications and identities are removed by ON DELETE CASCADE.
  await auth(gotrue.admin.deleteUser(session.claims.sub));
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
});
