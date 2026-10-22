import { getLocale, getT } from '../i18n';
import { ApiError, bffUrl } from '../lib/api';
import { bridge } from '../platform';

/** Public party GETs. Desktop uses the BFF; the site and the web app use this origin. */
export async function publicGet<T>(path: string): Promise<T> {
  const base = bridge() ? await bffUrl() : location.origin;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      headers: {
        accept: 'application/json',
        'accept-language': getLocale(),
      },
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
