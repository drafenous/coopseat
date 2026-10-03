import { NextResponse } from 'next/server';
import { auth } from '@/server/auth-errors';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { ApiError, route } from '@/server/http';
import { startVerification } from '@/server/identity/service';
import { getProfile } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth } from '@/server/session';

/** Starts an age verification with the configured KYC provider and returns its URL. */
export const POST = route(async (req) => {
  const session = await requireAuth(req, { aal2IfEnrolled: true });
  await rateLimit('kyc', session.claims.sub);

  const user = await auth(gotrue.getUser(session.token));
  if (!user.email || !user.email_confirmed_at) {
    throw new ApiError(403, 'email_unconfirmed', 'Confirme seu e-mail antes de verificar a idade.');
  }
  const profile = await getProfile(user.id);
  if (!profile?.nickname) throw new ApiError(403, 'nickname_required', 'Escolha um apelido antes de verificar a idade.');

  const returnUrl =
    session.mode === 'bearer' ? `${env.appUrl}/auth/abrir-app?to=${encodeURIComponent('coopseat://auth/verified')}` : `${env.appUrl}/conta?verificacao=1`;
  const { url } = await startVerification(user.id, returnUrl);
  return NextResponse.json({ url });
});
