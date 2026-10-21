import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function github(status = 200) {
  return vi.fn(async () => {
    if (status !== 200) return new Response(null, { status });
    return Response.json({
      tag_name: 'desktop-v0.4.1',
      published_at: '2026-10-21T00:00:00Z',
      assets: [
        { id: 2, name: 'CoopSeat-0.4.1-Setup.exe', size: 98_000_000 },
        { id: 3, name: 'CoopSeat-0.4.1-Portable.exe', size: 97_000_000 },
      ],
    });
  });
}

async function load() {
  vi.resetModules();
  return (await import('@/app/api/desktop/release/route')).GET;
}

describe('GET /api/desktop/release', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_RELEASES_TOKEN', 'gh-token');
    vi.stubEnv('GITHUB_RELEASES_REPO', 'drafenous/coopseat');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns the latest desktop version without the tag prefix', async () => {
    vi.stubGlobal('fetch', github());
    const GET = await load();
    const res = await GET(
      new NextRequest('https://coopseat.com/api/desktop/release'),
      undefined,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ version: '0.4.1' });
  });

  it('hides a GitHub failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', github(500));
    const GET = await load();
    const res = await GET(
      new NextRequest('https://coopseat.com/api/desktop/release'),
      undefined,
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('download_unavailable');
  });
});
