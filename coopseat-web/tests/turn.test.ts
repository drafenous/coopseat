import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as turn } from '@/app/api/turn/route';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({ adminDb: async () => fake.current.db, getDb: async () => fake.current.db }));
vi.mock('@/server/jwt', () => ({
  verifyAccessToken: async (token: string) => (token === 'valid' ? { sub: 'user-1', aal: 'aal1' } : null),
}));

const ctx = undefined as never;
const request = (token?: string, headers: Record<string, string> = {}) =>
  new NextRequest('https://coopseat.com/api/turn', {
    method: 'POST',
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
  });
const iceServers = [
  { urls: ['stun:stun.cloudflare.com:3478'] },
  { urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' },
];
const STUN_ONLY = [{ urls: ['stun:stun.cloudflare.com:3478'] }];

const policy = (values: Record<string, unknown>) => fake.current.db.orm.public.RelayPolicy.create({ id: 'global', ...values });
const override = (values: Record<string, unknown>) =>
  fake.current.db.orm.public.RelayUserOverride.create({ profileId: 'user-1', ...values });
const issued = (count: number, issuedAt = new Date().toISOString()) =>
  Promise.all(
    Array.from({ length: count }, () =>
      fake.current.db.orm.public.RelayCredential.create({
        profileId: 'user-1',
        username: 'old',
        audience: 'member',
        issuedAt,
        expiresAt: issuedAt,
      }),
    ),
  );

describe('POST /api/turn', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fake.current = createFakeDb();
    vi.stubEnv('CLOUDFLARE_TURN_KEY_ID', 'key-id');
    vi.stubEnv('CLOUDFLARE_TURN_API_TOKEN', 'api-token');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    fetchSpy = vi.fn(async () => Response.json({ iceServers }, { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const expectDenied = async (req: NextRequest, reason: string) => {
    const res = await turn(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ relay: false, reason, iceServers: STUN_ONLY });
    expect(body.message).toEqual(expect.any(String));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fake.current.data.RelayCredential.filter((c) => c.username === 'u')).toHaveLength(0);
  };

  it('requires a session', async () => {
    expect((await turn(request(), ctx)).status).toBe(401);
    expect((await turn(request('forged'), ctx)).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns Cloudflare ICE servers without caching and records the credential', async () => {
    const res = await turn(request('valid', { 'x-coopseat-version': '0.2.0' }), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json();
    expect(body).toMatchObject({ iceServers, relay: true, maxRelayBitrateKbps: 4000 });
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/turn/keys/key-id/credentials/generate-ice-servers');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer api-token');
    expect(JSON.parse(init.body as string)).toEqual({ ttl: 14400 });
    expect(fake.current.data.RelayCredential).toEqual([
      expect.objectContaining({ profileId: 'user-1', username: 'u', audience: 'member', appVersion: '0.2.0' }),
    ]);
  });

  it('uses the TTL and bitrate cap from the policy', async () => {
    await policy({ credentialTtlSeconds: 3600, maxRelayBitrateKbps: 2500 });
    const before = Math.floor(Date.now() / 1000);
    const body = await (await turn(request('valid'), ctx)).json();
    expect(body.maxRelayBitrateKbps).toBe(2500);
    expect(body.expiresAt - before).toBeGreaterThanOrEqual(3600);
    expect(body.expiresAt - before).toBeLessThanOrEqual(3601);
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ ttl: 3600 });
  });

  it('falls back to STUN when the global switch is off', async () => {
    await policy({ enabled: false });
    await expectDenied(request('valid'), 'relay_unavailable');
  });

  it('falls back to STUN when members are switched off', async () => {
    await policy({ membersEnabled: false, guestsEnabled: true });
    await expectDenied(request('valid'), 'relay_unavailable');
  });

  it('blocks app versions below the minimum or on the block list', async () => {
    await policy({ minAppVersion: '0.2.0', blockedAppVersions: '0.3.1, 0.4.0' });
    await expectDenied(request('valid', { 'x-coopseat-version': '0.1.9' }), 'relay_app_outdated');
    await expectDenied(request('valid', { 'x-coopseat-version': '0.3.1' }), 'relay_app_outdated');
    expect((await (await turn(request('valid', { 'x-coopseat-version': '0.3.0' }), ctx)).json()).relay).toBe(true);
  });

  it('does not apply version rules to browsers', async () => {
    await policy({ minAppVersion: '9.0.0' });
    expect((await (await turn(request('valid'), ctx)).json()).relay).toBe(true);
  });

  it('blocks a user until the block expires', async () => {
    await override({ blocked: true, reason: 'abuse', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await expectDenied(request('valid'), 'relay_unavailable');

    fake.current.data.RelayUserOverride[0]!.expiresAt = new Date(Date.now() - 1000).toISOString();
    expect((await (await turn(request('valid'), ctx)).json()).relay).toBe(true);
  });

  it('enforces the daily credential quota, ignoring credentials older than 24 hours', async () => {
    await policy({ dailyCredentialQuota: 2 });
    await issued(3, new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());
    await issued(2);
    await expectDenied(request('valid'), 'relay_quota_exceeded');
  });

  it('lets a per-user quota override the global one', async () => {
    await policy({ dailyCredentialQuota: 1 });
    await issued(1);
    await override({ dailyQuota: 5 });
    expect((await (await turn(request('valid'), ctx)).json()).relay).toBe(true);
  });

  it('hides upstream failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchSpy.mockImplementation(async () => new Response('boom', { status: 500 }));
    const res = await turn(request('valid'), ctx);
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('turn_unavailable');
    expect(fake.current.data.RelayCredential).toHaveLength(0);
  });
});
