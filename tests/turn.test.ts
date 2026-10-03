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
const request = (token?: string) =>
  new NextRequest('https://coopseat.com/api/turn', {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
const iceServers = [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' }];

describe('POST /api/turn', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
    vi.stubEnv('CLOUDFLARE_TURN_KEY_ID', 'key-id');
    vi.stubEnv('CLOUDFLARE_TURN_API_TOKEN', 'api-token');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('requires a session', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect((await turn(request(), ctx)).status).toBe(401);
    expect((await turn(request('forged'), ctx)).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns Cloudflare ICE servers without caching', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ iceServers }, { status: 201 }));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await turn(request('valid'), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect((await res.json()).iceServers).toEqual(iceServers);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/turn/keys/key-id/credentials/generate-ice-servers');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer api-token');
  });

  it('hides upstream failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const res = await turn(request('valid'), ctx);
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('turn_unavailable');
  });
});
