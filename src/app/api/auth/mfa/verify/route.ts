import { z } from 'zod';
import { totpCodeSchema } from '@/lib/validation/account';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth, sessionResponse } from '@/server/session';

const bodySchema = z.object({ factorId: z.string().uuid(), code: totpCodeSchema });

/** Confirms a freshly enrolled TOTP factor (or steps an existing session up to aal2). */
export const POST = route(async (req) => {
  const session = await requireAuth(req);
  await rateLimit('mfa', session.claims.sub);
  const { factorId, code } = await readJson(req, bodySchema);
  const challenge = await auth(gotrue.challenge(session.token, factorId));
  const tokens = await auth(gotrue.verifyFactor(session.token, factorId, challenge.id, code));
  return sessionResponse(req, tokens, { ok: true });
});
