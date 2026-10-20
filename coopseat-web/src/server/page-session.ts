import { cookies } from 'next/headers';
import { withAuthDb } from '@/prisma/request-db';
import { accountSummary } from './account';
import { gotrue } from './gotrue';
import { verifyAccessToken } from './jwt';
import { ACCESS_COOKIE } from './session';

/** Session for server components (cookies only; the proxy keeps them fresh). */
export async function getPageSession() {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyAccessToken(token);
  return claims ? { token, claims } : null;
}

export async function getPageAccount() {
  return withAuthDb(async () => {
    const session = await getPageSession();
    if (!session) return null;
    try {
      const user = await gotrue.getUser(session.token);
      return accountSummary(user, session.claims);
    } catch {
      return null;
    }
  });
}
