import { NextResponse } from 'next/server';
import { z } from 'zod';
import { totpCodeSchema } from '@/lib/validation/account';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { ApiError, clientIp, readJson, route } from '@/server/http';
import { MFA_COOKIE, unsealMfaToken, verifiedFactors } from '@/server/oauth-state';
import { rateLimit } from '@/server/rate-limit';
import { assertSameOrigin, sessionResponse } from '@/server/session';

const bodySchema = z.object({
  mfaToken: z.string().max(8192).optional(),
  factorId: z.string().uuid().optional(),
  code: totpCodeSchema,
});

/** Second login step: exchanges the pending aal1 session (mfaToken or cookie) for an aal2 session. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  await rateLimit('mfa', clientIp(req));
  const input = await readJson(req, bodySchema);
  const pending = unsealMfaToken(input.mfaToken ?? req.cookies.get(MFA_COOKIE)?.value);
  if (!pending) throw new ApiError(401, 'mfa_expired', 'O tempo para confirmar o código acabou. Entre novamente.');

  const factorId = input.factorId ?? verifiedFactors(pending)[0]?.id;
  if (!factorId) throw new ApiError(400, 'mfa_not_enrolled', 'Nenhum autenticador encontrado.');

  const challenge = await auth(gotrue.challenge(pending.access_token, factorId));
  const tokens = await auth(gotrue.verifyFactor(pending.access_token, factorId, challenge.id, input.code));
  const res: NextResponse = sessionResponse(req, tokens, { ok: true });
  res.cookies.delete(MFA_COOKIE);
  return res;
});
