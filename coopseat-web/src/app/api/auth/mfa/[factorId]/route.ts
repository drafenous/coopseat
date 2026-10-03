import { NextResponse } from 'next/server';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth } from '@/server/session';

type Ctx = { params: Promise<{ factorId: string }> };

export const DELETE = route<Ctx>(async (req, ctx) => {
  const session = await requireAuth(req);
  if (session.claims.aal !== 'aal2') {
    throw new ApiError(403, 'mfa_required');
  }
  await rateLimit('mfa', session.claims.sub);
  const { factorId } = await ctx.params;
  await auth(gotrue.unenroll(session.token, factorId));
  return NextResponse.json({ ok: true });
});
