import { env } from './env';
import { ApiError } from './http';

const GITHUB_API = 'https://api.github.com';
const RELEASE_TTL_MS = 5 * 60_000;
// GitHub's signed asset URLs expire after ~5 minutes.
const URL_TTL_MS = 60_000;

export const VARIANTS = ['installer', 'portable'] as const;
export type Variant = (typeof VARIANTS)[number];
const ASSET_PATTERNS: Record<Variant, RegExp> = { installer: /-Setup\.exe$/i, portable: /-Portable\.exe$/i };

export function isVariant(value: string): value is Variant {
  return (VARIANTS as readonly string[]).includes(value);
}

export type ReleaseFile = { fileName: string; size: number };
export type LatestRelease = { version: string; publishedAt: string; files: Partial<Record<Variant, ReleaseFile>> };

type Cache = {
  release: LatestRelease;
  assetIds: Partial<Record<Variant, number>>;
  expiresAt: number;
  urls: Partial<Record<Variant, { url: string; expiresAt: number }>>;
};
let cache: Cache | null = null;

function githubHeaders(accept = 'application/vnd.github+json'): HeadersInit {
  return {
    Accept: accept,
    Authorization: `Bearer ${env.githubReleasesToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'coopseat-web',
  };
}

function unavailable(reason: string, status?: number): ApiError {
  console.error('GitHub release error', reason, status ?? '');
  cache = null;
  return new ApiError(502, 'download_unavailable');
}

async function loadLatest(now: number): Promise<Cache> {
  if (cache && cache.expiresAt > now) return cache;
  const res = await fetch(`${GITHUB_API}/repos/${env.githubReleasesRepo}/releases/latest`, {
    headers: githubHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw unavailable('latest release', res.status);
  const body = (await res.json()) as {
    tag_name: string;
    published_at: string;
    assets: { id: number; name: string; size: number }[];
  };
  const files: LatestRelease['files'] = {};
  const assetIds: Cache['assetIds'] = {};
  for (const variant of VARIANTS) {
    const asset = body.assets.find((a) => ASSET_PATTERNS[variant].test(a.name));
    if (!asset) continue;
    files[variant] = { fileName: asset.name, size: asset.size };
    assetIds[variant] = asset.id;
  }
  if (!files.installer && !files.portable) throw unavailable('no Windows assets');
  cache = {
    release: { version: body.tag_name.replace(/^desktop-v/, ''), publishedAt: body.published_at, files },
    assetIds,
    expiresAt: now + RELEASE_TTL_MS,
    urls: {},
  };
  return cache;
}

/** The latest (non-draft, non-prerelease) desktop release and the Windows files attached to it. */
export async function latestRelease(): Promise<LatestRelease> {
  return (await loadLatest(Date.now())).release;
}

/** Short-lived download URL for one Windows file of the latest release. */
export async function latestDownloadUrl(variant: Variant): Promise<string> {
  const now = Date.now();
  const latest = await loadLatest(now);
  const assetId = latest.assetIds[variant];
  if (!assetId) throw new ApiError(404, 'download_unavailable');
  const cached = latest.urls[variant];
  if (cached && cached.expiresAt > now) return cached.url;

  const res = await fetch(`${GITHUB_API}/repos/${env.githubReleasesRepo}/releases/assets/${assetId}`, {
    headers: githubHeaders('application/octet-stream'),
    redirect: 'manual',
    cache: 'no-store',
  });
  const location = res.headers.get('location');
  if (res.status < 300 || res.status >= 400 || !location) throw unavailable('asset redirect', res.status);
  latest.urls[variant] = { url: location, expiresAt: now + URL_TTL_MS };
  return location;
}
