import { z } from 'zod';
import { totpCodeSchema } from '@/lib/validation/account';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { replaceSecurityCodes } from '@/server/security-codes';
import { requireAuth, sessionResponse } from '@/server/session';

const bodySchema = z.object({ code: totpCodeSchema });

/** Burns the current security codes and returns a new batch once. */
export const POST = route((req) =>
  withAuthDb(async () => {
    const session = await requireAuth(req);
    await rateLimit('mfa', session.claims.sub);
    const { code } = await readJson(req, bodySchema);
    const user = await auth(gotrue.getUser(session.token));
    const factor = (user.factors ?? []).find((item) => item.status === 'verified');
    if (!factor) throw new ApiError(400, 'mfa_not_enrolled');
    const challenge = await auth(gotrue.challenge(session.token, factor.id));
    const tokens = await auth(
      gotrue.verifyFactor(session.token, factor.id, challenge.id, code),
    );
    const securityCodes = await replaceSecurityCodes(session.claims.sub);
    return sessionResponse(req, tokens, { ok: true, securityCodes });
  }),
);
