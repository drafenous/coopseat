import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const request = (variant: string) =>
  new NextRequest(`https://coopseat.com/download/${variant}`);
const params = (variant: string) => ({ params: Promise.resolve({ variant }) });
const signed = (id: number) =>
  `https://objects.githubusercontent.com/github-production-release-asset/${id}?sig=x`;

function github({
  assets,
  assetStatus = 302,
}: {
  assets?: { id: number; name: string; size: number }[];
  assetStatus?: number;
} = {}) {
  const release = {
    tag_name: 'desktop-v0.1.2',
    published_at: '2026-10-03T12:00:00Z',
    assets: assets ?? [
      { id: 1, name: 'latest.yml', size: 400 },
      { id: 2, name: 'CoopSeat-0.1.2-Setup.exe', size: 98_000_000 },
      { id: 3, name: 'CoopSeat-0.1.2-Portable.exe', size: 97_000_000 },
    ],
  };
  return vi.fn(async (url: string) => {
    if (url.endsWith('/releases/latest')) return Response.json(release);
    const id = Number(url.split('/').pop());
    return new Response(null, {
      status: assetStatus,
      headers: assetStatus === 302 ? { location: signed(id) } : {},
    });
  });
}

async function load() {
  vi.resetModules();
  return {
    GET: (await import('@/app/(main)/(site)/download/[variant]/route')).GET,
    releases: await import('@/server/releases'),
  };
}

describe('GET /download/[variant]', () => {
  beforeEach(() => {
    vi.stubEnv('GITHUB_RELEASES_TOKEN', 'gh-token');
    vi.stubEnv('GITHUB_RELEASES_REPO', 'drafenous/coopseat');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('redirects each variant to the signed URL of its asset', async () => {
    const fetchSpy = github();
    vi.stubGlobal('fetch', fetchSpy);
    const { GET } = await load();

    const installer = await GET(request('installer'), params('installer'));
    expect(installer.status).toBe(302);
    expect(installer.headers.get('location')).toBe(signed(2));
    expect(installer.headers.get('cache-control')).toBe('no-store');
    const portable = await GET(request('portable'), params('portable'));
    expect(portable.headers.get('location')).toBe(signed(3));

    const [latestUrl, latestInit] = fetchSpy.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(latestUrl).toBe(
      'https://api.github.com/repos/drafenous/coopseat/releases/latest',
    );
    expect((latestInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer gh-token',
    );
    const [assetUrl, assetInit] = fetchSpy.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect(assetUrl).toBe(
      'https://api.github.com/repos/drafenous/coopseat/releases/assets/2',
    );
    expect(assetInit.redirect).toBe('manual');
  });

  it('shares one cached lookup between the page details and repeated downloads', async () => {
    const fetchSpy = github();
    vi.stubGlobal('fetch', fetchSpy);
    const { GET, releases } = await load();
    expect(await releases.latestRelease()).toEqual({
      version: '0.1.2',
      publishedAt: '2026-10-03T12:00:00Z',
      files: {
        installer: { fileName: 'CoopSeat-0.1.2-Setup.exe', size: 98_000_000 },
        portable: { fileName: 'CoopSeat-0.1.2-Portable.exe', size: 97_000_000 },
      },
    });
    await GET(request('installer'), params('installer'));
    await GET(request('installer'), params('installer'));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('returns 404 for unknown variants and files missing from the release', async () => {
    vi.stubGlobal(
      'fetch',
      github({
        assets: [{ id: 2, name: 'CoopSeat-0.1.1-Setup.exe', size: 1 }],
      }),
    );
    const { GET, releases } = await load();
    expect((await releases.latestRelease()).files.portable).toBeUndefined();
    expect((await GET(request('portable'), params('portable'))).status).toBe(
      404,
    );
    expect((await GET(request('other'), params('other'))).status).toBe(404);
  });

  it('hides upstream failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', github({ assetStatus: 404 }));
    const res = await (
      await load()
    ).GET(request('installer'), params('installer'));
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe('download_unavailable');
  });
});
