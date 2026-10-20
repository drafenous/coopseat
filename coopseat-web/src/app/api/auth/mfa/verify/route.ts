import { z } from 'zod';
import { totpCodeSchema } from '@/lib/validation/account';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { replaceSecurityCodes } from '@/server/security-codes';
import { requireAuth, sessionResponse } from '@/server/session';

const bodySchema = z.object({
  factorId: z.string().uuid(),
  code: totpCodeSchema,
});

/** Confirms a freshly enrolled TOTP factor (or steps an existing session up to aal2). */
export const POST = route((req) =>
  withAuthDb(async () => {
    const session = await requireAuth(req);
    await rateLimit('mfa', session.claims.sub);
    const { factorId, code } = await readJson(req, bodySchema);
    const user = await auth(gotrue.getUser(session.token));
    const factor = (user.factors ?? []).find((item) => item.id === factorId);
    if (!factor) throw new ApiError(400, 'mfa_not_enrolled');
    const enrolling = factor.status === 'unverified';
    const challenge = await auth(gotrue.challenge(session.token, factorId));
    const tokens = await auth(
      gotrue.verifyFactor(session.token, factorId, challenge.id, code),
    );
    const securityCodes = enrolling
      ? await replaceSecurityCodes(session.claims.sub)
      : undefined;
    return sessionResponse(req, tokens, {
      ok: true,
      ...(securityCodes ? { securityCodes } : {}),
    });
  }),
);
