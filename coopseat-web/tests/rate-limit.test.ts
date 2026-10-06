import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIMITS, rateLimit } from '@/server/rate-limit';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
}));

describe('rate limit', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
  });

  it('blocks after the bucket limit, per subject', async () => {
    for (let i = 0; i < LIMITS.mfa.max; i++) await rateLimit('mfa', 'user-1');
    await expect(rateLimit('mfa', 'user-1')).rejects.toMatchObject({
      status: 429,
      code: 'rate_limited',
    });
    await expect(rateLimit('mfa', 'user-2')).resolves.toBeUndefined();
    await expect(rateLimit('login', 'user-1')).resolves.toBeUndefined();
  });

  it('ignores hits outside the window', async () => {
    for (let i = 0; i < LIMITS.mfa.max; i++) await rateLimit('mfa', 'user-1');
    const old = new Date(
      Date.now() - (LIMITS.mfa.windowSeconds + 1) * 1000,
    ).toISOString();
    for (const hit of fake.current.data.RateLimitHit) hit.createdAt = old;
    await expect(rateLimit('mfa', 'user-1')).resolves.toBeUndefined();
  });
});
