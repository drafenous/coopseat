import { NextResponse } from 'next/server';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { deleteSecurityCodes } from '@/server/security-codes';
import { requireAuth } from '@/server/session';

type Ctx = { params: Promise<{ factorId: string }> };

export const DELETE = route<Ctx>((req, ctx) =>
  withAuthDb(async () => {
    const session = await requireAuth(req);
    await rateLimit('mfa', session.claims.sub);
    const { factorId } = await ctx.params;
    const user = await auth(gotrue.getUser(session.token));
    const factor = (user.factors ?? []).find((item) => item.id === factorId);
    if (!factor) throw new ApiError(404, 'mfa_not_enrolled');
    if (factor.status === 'verified' && session.claims.aal !== 'aal2') {
      throw new ApiError(403, 'mfa_required');
    }
    await auth(gotrue.unenroll(session.token, factorId));
    if (factor.status === 'verified')
      await deleteSecurityCodes(session.claims.sub);
    return NextResponse.json({ ok: true });
  }),
);
