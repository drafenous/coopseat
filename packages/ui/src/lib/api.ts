import { getLocale, getT } from '../i18n';
import { bridge, platform } from '../platform';

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  /** Present after a security-code login. Sent back so the BFF treats the session as aal2. */
  stepUp?: string;
};
export type GateRequirement = 'email' | 'nickname' | 'age' | 'mfa';
export type Gate = { allowed: boolean; missing: GateRequirement[] };
export type AgeStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
export type Account = {
  id: string;
  email: string | null;
  pendingEmail: string | null;
  emailConfirmed: boolean;
  needsEmail: boolean;
  nickname: string | null;
  nicknameChangedAt: string | null;
  avatarUrl: string | null;
  ageStatus: AgeStatus;
  ageVerifiedAt: string | null;
  termsVersion: string | null;
  identities: { id: string; provider: string; email: string | null }[];
  mfa: {
    enabled: boolean;
    factors: { id: string; name: string }[];
    level: 'aal1' | 'aal2';
    securityCodesRemaining: number;
  };
  permissions: { watch: Gate; chat: Gate; host: Gate };
  message?: string;
};
export type MfaPending = {
  mfaRequired: true;
  mfaToken: string;
  factors: { id: string; name: string }[];
};
export type LoginResult = { session: Session } | MfaPending;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const DEFAULT_BFF = 'https://coopseat.com';
export {
  OAUTH_PROVIDERS,
  PROVIDER_LABELS,
  type OAuthProvider,
} from './providers';

let bff: Promise<string> | null = null;
export const bffUrl = () => {
  const b = bridge();
  return (bff ??= b
    ? b.info().then(
        (i) => i.bffUrl || DEFAULT_BFF,
        () => DEFAULT_BFF,
      )
    : Promise.resolve(
        platform().kind === 'web' && cookieSession()
          ? location.origin
          : DEFAULT_BFF,
      ));
};
/** On the web the BFF serves this page, so the session lives in its httpOnly cookies. */
const cookieSession = () => {
  const p = platform();
  return p.kind === 'web' && p.accounts;
};

const SESSION_KEY = 'auth.session';
let session: Session | null = null,
  loaded = false;
const isSession = (s: unknown): s is Session => {
  const x = s as Session;
  return (
    Boolean(x) &&
    typeof x.accessToken === 'string' &&
    typeof x.refreshToken === 'string' &&
    typeof x.expiresAt === 'number'
  );
};

export async function loadSession() {
  if (loaded) return session;
  try {
    const raw = await bridge()?.secureStore.get(SESSION_KEY);
    const s: unknown = raw ? JSON.parse(raw) : null;
    session = isSession(s) ? s : null;
  } catch {
    session = null;
  }
  loaded = true;
  return session;
}
export async function saveSession(s: Session | null) {
  const b = bridge();
  if (!b) return;
  session = s;
  loaded = true;
  if (s) await b.secureStore.set(SESSION_KEY, JSON.stringify(s));
  else await b.secureStore.remove(SESSION_KEY);
}

/** Desktop only: lets the BFF apply version rules (e.g. relay access for outdated builds). */
let appVersion: Promise<string> | null = null;
const desktopVersion = () => {
  const b = bridge();
  return b
    ? (appVersion ??= b.info().then(
        (i) => i.version,
        () => '',
      ))
    : Promise.resolve('');
};

type Options = { method?: string; body?: unknown; auth?: boolean };
async function send<T>(
  path: string,
  { method = 'GET', body }: Options,
  token?: string,
): Promise<T> {
  const cookies = cookieSession();
  const headers: Record<string, string> = cookies
    ? {}
    : { 'x-coopseat-client': 'desktop' };
  headers['accept-language'] = getLocale();
  const version = await desktopVersion();
  if (version) headers['x-coopseat-version'] = version;
  if (!cookies) {
    const stored = await loadSession();
    if (stored?.stepUp) headers['x-coopseat-stepup'] = stored.stepUp;
  }
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${await bffUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: cookies ? 'same-origin' : 'omit',
    });
  } catch {
    throw new ApiError(0, 'network', getT().api.network);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(
      res.status,
      e.code ?? 'error',
      e.message ?? getT().api.generic,
      e.fields,
    );
  }
  return data as T;
}

/** Readable cookie set beside the httpOnly session. Matches `EXPIRY_COOKIE` in the BFF. */
const EXPIRY_COOKIE = 'cs_exp';
const AUTH_LEAD_S = 60;

let refreshing: Promise<Session | null> | null = null;
let cookieRefreshing: Promise<boolean> | null = null;

function accessCookieExpiry(): number | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${EXPIRY_COOKIE}=(\\d+)`),
  );
  if (!match?.[1]) return null;
  const exp = Number(match[1]);
  return Number.isFinite(exp) ? exp : null;
}

/**
 * Renews the httpOnly session cookies. One flight: the refresh token rotates, and a second
 * call with the old one would sign the user out.
 */
function refreshCookieSession(): Promise<boolean> {
  return (cookieRefreshing ??= (async () => {
    try {
      await send('/api/auth/refresh', { method: 'POST' });
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return false;
      throw e;
    }
  })().finally(() => {
    cookieRefreshing = null;
  }));
}

/** Single-flight refresh; a rejected refresh token signs the user out. */
export function refreshSession() {
  return (refreshing ??= (async () => {
    const current = await loadSession();
    if (!current) return null;
    try {
      const r = await send<{ session: Session }>('/api/auth/refresh', {
        method: 'POST',
        body: { refreshToken: current.refreshToken },
      });
      const kept = current.stepUp;
      const next =
        kept && !r.session.stepUp ? { ...r.session, stepUp: kept } : r.session;
      await saveSession(next);
      return next;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await saveSession(null);
        return null;
      }
      throw e;
    }
  })().finally(() => {
    refreshing = null;
  }));
}

export const checkNickname = (nickname: string) =>
  send<{ available: boolean; reason?: string }>(
    `/api/nicknames/available?n=${encodeURIComponent(nickname)}`,
    {},
  );

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  if (opts.auth === false) return send<T>(path, opts);
  const cookies = cookieSession();
  let s = await loadSession();
  if (s && s.expiresAt - AUTH_LEAD_S < Date.now() / 1000)
    s = await refreshSession();
  else if (cookies) {
    const exp = accessCookieExpiry();
    // No expiry cookie (a session from before it existed) still refreshes on 401 below.
    if (exp !== null && exp - AUTH_LEAD_S < Date.now() / 1000) {
      try {
        await refreshCookieSession();
      } catch {
        /* the access cookie may still be valid */
      }
    }
  }
  try {
    return await send<T>(path, opts, s?.accessToken);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) throw e;
    if (s) {
      const next = await refreshSession();
      if (!next) throw e;
      return send<T>(path, opts, next.accessToken);
    }
    if (!cookies || !(await refreshCookieSession())) throw e;
    return send<T>(path, opts);
  }
}
