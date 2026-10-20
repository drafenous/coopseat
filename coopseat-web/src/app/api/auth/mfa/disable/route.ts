import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import {
  consumeSecurityCode,
  deleteSecurityCodes,
} from '@/server/security-codes';
import { requireAuth, sessionResponse } from '@/server/session';

const bodySchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().trim().min(1).max(40),
});

/** Turns 2FA off after a fresh authenticator code or an unused security code. */
export const POST = route((req) =>
  withAuthDb(async () => {
    const session = await requireAuth(req);
    await rateLimit('mfa', session.claims.sub);
    const { factorId, code } = await readJson(req, bodySchema);
    const user = await auth(gotrue.getUser(session.token));
    const factor = (user.factors ?? []).find(
      (item) => item.id === factorId && item.status === 'verified',
    );
    if (!factor) throw new ApiError(400, 'mfa_not_enrolled');

    if (/^\d{6}$/.test(code)) {
      const challenge = await auth(gotrue.challenge(session.token, factorId));
      const tokens = await auth(
        gotrue.verifyFactor(session.token, factorId, challenge.id, code),
      );
      await auth(gotrue.unenroll(tokens.access_token, factorId));
      await deleteSecurityCodes(session.claims.sub);
      return sessionResponse(req, tokens, { ok: true });
    }

    const consumed = await consumeSecurityCode(session.claims.sub, code);
    if (!consumed) throw new ApiError(400, 'mfa_verification_failed');
    await auth(gotrue.admin.deleteFactor(session.claims.sub, factorId));
    await deleteSecurityCodes(session.claims.sub);
    return NextResponse.json({ ok: true });
  }),
);
