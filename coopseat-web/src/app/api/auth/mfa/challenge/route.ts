import { z } from 'zod';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, clientIp, readJson, route } from '@/server/http';
import { verifyAccessToken } from '@/server/jwt';
import {
  MFA_COOKIE,
  sealStepUp,
  unsealMfaToken,
  verifiedFactors,
} from '@/server/oauth-state';
import { rateLimit } from '@/server/rate-limit';
import { consumeSecurityCode } from '@/server/security-codes';
import { assertSameOrigin, sessionResponse } from '@/server/session';

const bodySchema = z.object({
  mfaToken: z.string().max(8192).optional(),
  factorId: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
});

/** Second login step: TOTP upgrades the JWT to aal2; a security code seals a step-up for that session. */
export const POST = route((req) =>
  withAuthDb(async () => {
    assertSameOrigin(req);
    await rateLimit('mfa', clientIp(req));
    const input = await readJson(req, bodySchema);
    const pending = unsealMfaToken(
      input.mfaToken ?? req.cookies.get(MFA_COOKIE)?.value,
    );
    if (!pending) throw new ApiError(401, 'mfa_expired');

    if (/^\d{6}$/.test(input.code)) {
      const factorId = input.factorId ?? verifiedFactors(pending)[0]?.id;
      if (!factorId) throw new ApiError(400, 'mfa_not_enrolled');
      const challenge = await auth(
        gotrue.challenge(pending.access_token, factorId),
      );
      const tokens = await auth(
        gotrue.verifyFactor(
          pending.access_token,
          factorId,
          challenge.id,
          input.code,
        ),
      );
      const res = sessionResponse(req, tokens, { ok: true });
      res.cookies.delete(MFA_COOKIE);
      return res;
    }

    const consumed = await consumeSecurityCode(pending.user.id, input.code);
    if (!consumed) throw new ApiError(400, 'mfa_verification_failed');
    const claims = await verifyAccessToken(pending.access_token);
    if (!claims?.session_id) throw new ApiError(401, 'mfa_expired');
    const res = sessionResponse(
      req,
      pending,
      { ok: true },
      { stepUp: sealStepUp(claims.sub, claims.session_id) },
    );
    res.cookies.delete(MFA_COOKIE);
    return res;
  }),
);
