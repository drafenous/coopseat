import { adminDb, tryLockedRateLimit } from '@/prisma/db';
import { ApiError } from './http';

export type Limit = { max: number; windowSeconds: number };

export const LIMITS = {
  signup: { max: 5, windowSeconds: 3600 },
  login: { max: 10, windowSeconds: 600 },
  forgot: { max: 5, windowSeconds: 3600 },
  nickname: { max: 60, windowSeconds: 60 },
  oauth: { max: 30, windowSeconds: 600 },
  exchange: { max: 30, windowSeconds: 600 },
  mfa: { max: 10, windowSeconds: 600 },
  account: { max: 30, windowSeconds: 600 },
  kyc: { max: 5, windowSeconds: 3600 },
  turn: { max: 20, windowSeconds: 600 },
  telemetry: { max: 30, windowSeconds: 600 },
  contact: { max: 5, windowSeconds: 3600 },
  report: { max: 5, windowSeconds: 3600 },
  party_join: { max: 60, windowSeconds: 600 },
  party_password: { max: 5, windowSeconds: 600 },
  party_admin: { max: 120, windowSeconds: 600 },
  party_session: { max: 20, windowSeconds: 600 },
} satisfies Record<string, Limit>;

/** Sliding-window limiter backed by Postgres, so it holds across serverless instances. */
export async function rateLimit(
  bucket: keyof typeof LIMITS,
  subject: string,
): Promise<void> {
  const { max, windowSeconds } = LIMITS[bucket];
  const key = `${bucket}:${subject}`;
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // The in-memory test database omits this lock and is already serial.
  if (typeof tryLockedRateLimit === 'function') {
    const locked = await tryLockedRateLimit(key, max, since);
    if (locked === 'limited') {
      throw new ApiError(429, 'rate_limited', { retryAfter: windowSeconds });
    }
    if (locked === 'ok') return;
  }

  const db = await adminDb();
  const hits = db.orm.public.RateLimitHit;

  const { total } = await hits
    .where((h) => h.key.eq(key))
    .where((h) => h.createdAt.gte(since))
    .aggregate((a) => ({ total: a.count() }));

  if (total >= max) {
    throw new ApiError(429, 'rate_limited', {
      retryAfter: windowSeconds,
    });
  }
  await hits.create({ key });
}
