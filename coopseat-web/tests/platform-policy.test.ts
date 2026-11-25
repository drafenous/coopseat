import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as startKyc } from '@/app/api/identity/sessions/route';
import { accountPermissions } from '@/server/account';
import type { AuthUser } from '@/server/gotrue';
import type { AccessClaims } from '@/server/jwt';
import {
  DEFAULT_PLATFORM_POLICY,
  getPlatformPolicy,
} from '@/server/platform-policy';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
  tryLockedRateLimit: async () => 'unsupported' as const,
}));
vi.mock('@/server/session', () => ({
  requireAuth: async () => ({
    token: 'access',
    claims: { sub: 'u1', aal: 'aal2' },
    mode: 'cookie',
  }),
}));
vi.mock('@/server/rate-limit', () => ({
  rateLimit: async () => undefined,
}));

const user = {
  id: 'u1',
  email: 'a@b.c',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  factors: [],
} as unknown as AuthUser;
const claims = { sub: 'u1', aal: 'aal1' } as AccessClaims;
const unverified = { nickname: 'Player', ageStatus: 'UNVERIFIED' };

describe('platform age-verification policy', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
  });

  it('defaults to verification still required when the row is missing', async () => {
    expect(await getPlatformPolicy()).toEqual(DEFAULT_PLATFORM_POLICY);
    const perms = accountPermissions(user, claims, unverified);
    expect(perms.watch.missing).toEqual(['age']);
    expect(perms.watch.allowed).toBe(false);
  });

  it('skipAgeVerification treats age as satisfied without VERIFIED', async () => {
    await fake.current.db.orm.public.PlatformPolicy.create({
      ageVerificationDisabled: false,
      skipAgeVerification: true,
    });
    expect(await getPlatformPolicy()).toEqual({
      ageVerificationDisabled: false,
      skipAgeVerification: true,
    });
    const perms = accountPermissions(user, claims, unverified, {
      skipAgeVerification: true,
    });
    expect(perms.watch.allowed).toBe(true);
    expect(perms.chat.allowed).toBe(true);
    expect(perms.host.allowed).toBe(true);
    expect(perms.watch.missing).toEqual([]);
  });

  it('reads both flags from the global row', async () => {
    await fake.current.db.orm.public.PlatformPolicy.create({
      ageVerificationDisabled: true,
      skipAgeVerification: true,
      note: 'didit off',
    });
    expect(await getPlatformPolicy()).toEqual({
      ageVerificationDisabled: true,
      skipAgeVerification: true,
    });
  });

  it('refuses new KYC sessions when ageVerificationDisabled is on', async () => {
    await fake.current.db.orm.public.PlatformPolicy.create({
      ageVerificationDisabled: true,
      skipAgeVerification: true,
    });
    const res = await startKyc(
      new NextRequest('https://coopseat.com/api/identity/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      }),
      undefined as never,
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: { code: 'kyc_unavailable' },
    });
  });
});
