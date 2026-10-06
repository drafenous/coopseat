import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  compareSemver,
  DEFAULT_RELAY_POLICY,
  evaluateRelay,
  isAppVersionBlocked,
} from '@/server/relay-policy';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
}));

describe('compareSemver', () => {
  it('orders versions numerically, ignoring a v prefix and pre-release suffixes', () => {
    expect(compareSemver('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareSemver('v1.2.3', '1.2.3')).toBe(0);
    expect(compareSemver('1.2', '1.2.0')).toBe(0);
    expect(compareSemver('1.2.3-beta.1', '1.2.3')).toBe(0);
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
  });
});

describe('isAppVersionBlocked', () => {
  const policy = {
    ...DEFAULT_RELAY_POLICY,
    minAppVersion: '0.2.0',
    blockedAppVersions: ' 0.3.1 ,,0.4.0',
  };

  it('blocks versions under the minimum and on the list, never unknown versions', () => {
    expect(isAppVersionBlocked(policy, '0.1.0')).toBe(true);
    expect(isAppVersionBlocked(policy, '0.3.1')).toBe(true);
    expect(isAppVersionBlocked(policy, 'v0.4.0')).toBe(true);
    expect(isAppVersionBlocked(policy, '0.3.0')).toBe(false);
    expect(isAppVersionBlocked(policy, null)).toBe(false);
  });
});

describe('evaluateRelay', () => {
  const input = {
    audience: 'member' as const,
    profileId: 'user-1',
    appVersion: null,
  };

  beforeEach(() => {
    fake.current = createFakeDb();
  });

  it('allows with defaults when no policy row exists', async () => {
    expect(await evaluateRelay(input)).toEqual({
      allowed: true,
      policy: DEFAULT_RELAY_POLICY,
    });
  });

  it('checks the global switch before anything else', async () => {
    await fake.current.db.orm.public.RelayPolicy.create({
      enabled: false,
      membersEnabled: false,
    });
    await fake.current.db.orm.public.RelayUserOverride.create({
      profileId: 'user-1',
      blocked: true,
    });
    expect(await evaluateRelay(input)).toMatchObject({
      allowed: false,
      reason: 'disabled',
    });
  });

  it('switches audiences independently', async () => {
    await fake.current.db.orm.public.RelayPolicy.create({
      guestsEnabled: false,
    });
    expect(await evaluateRelay({ ...input, audience: 'guest' })).toMatchObject({
      allowed: false,
      reason: 'audience_disabled',
    });
    expect(await evaluateRelay(input)).toMatchObject({ allowed: true });
  });

  it('reports a version block before a user block', async () => {
    await fake.current.db.orm.public.RelayPolicy.create({
      minAppVersion: '1.0.0',
    });
    await fake.current.db.orm.public.RelayUserOverride.create({
      profileId: 'user-1',
      blocked: true,
    });
    expect(
      await evaluateRelay({ ...input, appVersion: '0.9.0' }),
    ).toMatchObject({ reason: 'app_version_blocked' });
    expect(await evaluateRelay(input)).toMatchObject({
      reason: 'user_blocked',
    });
  });

  it('ignores an expired override entirely, including its quota', async () => {
    await fake.current.db.orm.public.RelayPolicy.create({
      dailyCredentialQuota: 0,
    });
    await fake.current.db.orm.public.RelayUserOverride.create({
      profileId: 'user-1',
      dailyQuota: 10,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await evaluateRelay(input)).toMatchObject({
      allowed: false,
      reason: 'quota_exceeded',
    });
  });
});
