import { getLocale, getT } from '../i18n';
import { ApiError, bffUrl } from '../lib/api';
import { bridge } from '../platform';

/** Public party GETs. Desktop uses the BFF; the site and the web app use this origin. */
export async function publicGet<T>(path: string): Promise<T> {
  const desktop = bridge();
  const base = desktop ? await bffUrl() : location.origin;
  const headers: Record<string, string> = {
    accept: 'application/json',
    'accept-language': getLocale(),
  };
  // The BFF attaches CORS only when this header (or Authorization) is present.
  if (desktop) headers['x-coopseat-client'] = 'desktop';
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      headers,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'network', getT().api.network);
  }
  const data = (await res.json().catch(() => null)) as {
    error?: { code?: string; message?: string };
  } | null;
  if (!res.ok || !data) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'generic',
      data?.error?.message || getT().api.generic,
    );
  }
  return data as T;
}
