import { NextResponse } from 'next/server';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth } from '@/server/session';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (req, ctx) => {
  const session = await requireAuth(req, { aal2IfEnrolled: true });
  await rateLimit('account', session.claims.sub);
  const { id } = await ctx.params;

  const user = await auth(gotrue.getUser(session.token));
  const identities = user.identities ?? [];
  const identity = identities.find((i) => (i.identity_id ?? i.id) === id);
  if (!identity) throw new ApiError(404, 'identity_not_found', 'Vínculo não encontrado.');
  if (identities.length < 2) {
    throw new ApiError(400, 'single_identity_not_deletable', 'Você precisa manter pelo menos uma forma de login.');
  }

  await auth(gotrue.unlinkIdentity(session.token, identity.identity_id ?? identity.id));
  return NextResponse.json({ ok: true });
});
