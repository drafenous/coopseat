import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { withAuthDb } from '@/prisma/request-db';
import { auth } from '@/server/auth-errors';
import { gotrue } from '@/server/gotrue';
import { readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { requireAuth } from '@/server/session';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
});

export const POST = route((req) =>
  withAuthDb(async () => {
    const session = await requireAuth(req, { aal2IfEnrolled: true });
    await rateLimit('mfa', session.claims.sub);
    const { name } = await readJson(req, bodySchema);

    const user = await auth(gotrue.getUser(session.token));
    for (const factor of user.factors ?? []) {
      if (factor.status === 'unverified')
        await gotrue.unenroll(session.token, factor.id).catch(() => undefined);
    }

    const factor = await auth(
      gotrue.enrollTotp(
        session.token,
        name ?? `Authenticator ${randomBytes(4).toString('hex')}`,
      ),
    );
    return NextResponse.json({
      factorId: factor.id,
      qrCode: factor.totp.qr_code,
      secret: factor.totp.secret,
      uri: factor.totp.uri,
    });
  }),
);
