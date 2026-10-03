import { NextResponse, type NextRequest } from 'next/server';
import { setPasswordSchema } from '@/lib/validation/account';
import { auth } from './auth-errors';
import { gotrue } from './gotrue';
import { readJson } from './http';
import { rateLimit } from './rate-limit';
import { requireAuth } from './session';

/** Sets a new password for the signed-in user (recovery session or OAuth-only account). */
export async function changePassword(req: NextRequest): Promise<NextResponse> {
  const session = await requireAuth(req, { aal2IfEnrolled: true });
  await rateLimit('account', session.claims.sub);
  const { password } = await readJson(req, setPasswordSchema);
  await auth(gotrue.updateUser(session.token, { password }));
  return NextResponse.json({ ok: true, message: 'Senha atualizada.' });
}
