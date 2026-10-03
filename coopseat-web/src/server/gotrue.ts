import { env } from './env';

/** Thin REST client for Supabase Auth (GoTrue). Only the BFF talks to it. */

export type AuthIdentity = {
  id: string;
  identity_id?: string;
  provider: string;
  identity_data?: { email?: string; name?: string; avatar_url?: string; picture?: string };
};

export type AuthFactor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: 'verified' | 'unverified';
};

export type AuthUser = {
  id: string;
  email?: string;
  new_email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
  identities?: AuthIdentity[];
  factors?: AuthFactor[];
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: AuthUser;
};

export class GoTrueError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type CallOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string;
  admin?: boolean;
  query?: Record<string, string | undefined>;
};

async function call<T>(path: string, opts: CallOptions = {}): Promise<T> {
  const url = new URL(`${env.supabaseUrl}/auth/v1${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);

  const headers: Record<string, string> = {
    apikey: opts.admin ? env.secretKey : env.publishableKey,
    'Content-Type': 'application/json',
  };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: 'no-store',
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const code = String(data['error_code'] ?? data['code'] ?? data['error'] ?? res.status);
    const message = String(data['msg'] ?? data['message'] ?? data['error_description'] ?? 'Auth error');
    throw new GoTrueError(res.status, code, message);
  }
  return data as T;
}

export function withExpiry(tokens: AuthTokens): AuthTokens & { expires_at: number } {
  return { ...tokens, expires_at: tokens.expires_at ?? Math.floor(Date.now() / 1000) + tokens.expires_in };
}

export const gotrue = {
  signUp(email: string, password: string, redirectTo: string, data: Record<string, unknown>) {
    return call<AuthUser | AuthTokens>('/signup', {
      method: 'POST',
      body: { email, password, data },
      query: { redirect_to: redirectTo },
    });
  },
  resendSignup(email: string, redirectTo: string) {
    return call<unknown>('/resend', {
      method: 'POST',
      body: { type: 'signup', email, options: { email_redirect_to: redirectTo } },
    });
  },
  passwordGrant(email: string, password: string) {
    return call<AuthTokens>('/token', { method: 'POST', body: { email, password }, query: { grant_type: 'password' } });
  },
  refreshGrant(refreshToken: string) {
    return call<AuthTokens>('/token', {
      method: 'POST',
      body: { refresh_token: refreshToken },
      query: { grant_type: 'refresh_token' },
    });
  },
  /** Signs in with a provider's OpenID id_token. With `linkTo` (a user access token) the identity is linked instead. */
  idTokenGrant(opts: { provider: string; idToken: string; accessToken?: string; nonce: string; linkTo?: string }) {
    return call<AuthTokens>('/token', {
      method: 'POST',
      token: opts.linkTo,
      body: {
        provider: opts.provider,
        id_token: opts.idToken,
        access_token: opts.accessToken,
        nonce: opts.nonce,
        link_identity: Boolean(opts.linkTo),
      },
      query: { grant_type: 'id_token' },
    });
  },
  recover(email: string, redirectTo: string) {
    return call<unknown>('/recover', { method: 'POST', body: { email }, query: { redirect_to: redirectTo } });
  },
  verifyOtp(type: string, tokenHash: string) {
    return call<AuthTokens>('/verify', { method: 'POST', body: { type, token_hash: tokenHash } });
  },
  getUser(token: string) {
    return call<AuthUser>('/user', { token });
  },
  updateUser(token: string, attrs: { email?: string; password?: string; data?: Record<string, unknown> }, redirectTo?: string) {
    return call<AuthUser>('/user', { method: 'PUT', token, body: attrs, query: { redirect_to: redirectTo } });
  },
  logout(token: string) {
    return call<unknown>('/logout', { method: 'POST', token, query: { scope: 'local' } });
  },
  unlinkIdentity(token: string, identityId: string) {
    return call<unknown>(`/user/identities/${encodeURIComponent(identityId)}`, { method: 'DELETE', token });
  },
  enrollTotp(token: string, friendlyName: string) {
    return call<{ id: string; totp: { qr_code: string; secret: string; uri: string } }>('/factors', {
      method: 'POST',
      token,
      body: { factor_type: 'totp', friendly_name: friendlyName, issuer: 'CoopSeat' },
    });
  },
  challenge(token: string, factorId: string) {
    return call<{ id: string }>(`/factors/${encodeURIComponent(factorId)}/challenge`, { method: 'POST', token });
  },
  verifyFactor(token: string, factorId: string, challengeId: string, code: string) {
    return call<AuthTokens>(`/factors/${encodeURIComponent(factorId)}/verify`, {
      method: 'POST',
      token,
      body: { challenge_id: challengeId, code },
    });
  },
  unenroll(token: string, factorId: string) {
    return call<unknown>(`/factors/${encodeURIComponent(factorId)}`, { method: 'DELETE', token });
  },
  admin: {
    getUser(id: string) {
      return call<AuthUser>(`/admin/users/${encodeURIComponent(id)}`, { admin: true });
    },
    deleteUser(id: string) {
      return call<unknown>(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true });
    },
  },
};
