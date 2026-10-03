import { DEFAULT_LOCALE, isLocale } from '@/i18n/config';
import { dictionaries } from '@/i18n/dictionaries';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly fields?: Record<string, string[] | undefined>,
  ) {
    super(message);
  }
}

/** Same-origin JSON call to the BFF; the session travels in httpOnly cookies. */
export async function api<T = Record<string, unknown>>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (data['error'] ?? {}) as { message?: string; code?: string; fields?: Record<string, string[]> };
    const fallback = dictionaries[isLocale(document.documentElement.lang) ? document.documentElement.lang : DEFAULT_LOCALE].common.genericError;
    throw new ApiClientError(err.message ?? fallback, res.status, err.code ?? 'error', err.fields);
  }
  return data as T;
}
