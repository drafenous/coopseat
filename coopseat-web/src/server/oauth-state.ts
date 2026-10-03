import { NextResponse, type NextRequest } from 'next/server';
import { pkceChallenge, randomToken, seal, sha256Hex, unseal } from './crypto';
import { env } from './env';
import type { AuthTokens } from './gotrue';
import { googleAuthorizeUrl } from './google';

const STATE_COOKIE = 'cs_oauth';
export const MFA_COOKIE = 'cs_mfa';
const STATE_TTL = 600;
export const MFA_TTL = 300;

export type OAuthMode = 'web' | 'desktop' | 'link-web' | 'link-desktop';

export type OAuthState = {
  /** PKCE verifier for the code exchange with Google. */
  verifier: string;
  /** Echoed back by Google; must match to accept the callback (CSRF). */
  state: string;
  /** Raw nonce; Google receives its sha256 and GoTrue checks it against the id_token. */
  nonce: string;
  mode: OAuthMode;
  next?: string;
  /** PKCE challenge from the desktop app, bound to the login ticket. */
  desktopChallenge?: string;
  /** Access token of the account receiving the identity (link modes). */
  linkTo?: string;
};

export type OAuthFlow = Omit<OAuthState, 'verifier' | 'state' | 'nonce'>;

/** Redirects the browser to Google and remembers the flow in a sealed cookie. */
export function startGoogleOAuth(flow: OAuthFlow): NextResponse {
  const verifier = randomToken(48);
  const state = randomToken(24);
  const nonce = randomToken(24);
  const url = googleAuthorizeUrl({ state, nonceHash: sha256Hex(nonce), codeChallenge: pkceChallenge(verifier) });
  const res = NextResponse.redirect(url, 303);
  setOAuthState(res, { ...flow, verifier, state, nonce });
  return res;
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});

export function setOAuthState(res: NextResponse, state: OAuthState): void {
  res.cookies.set(STATE_COOKIE, seal(state, STATE_TTL), cookieOptions(STATE_TTL));
}

export function readOAuthState(req: NextRequest): OAuthState | null {
  const raw = req.cookies.get(STATE_COOKIE)?.value;
  return raw ? unseal<OAuthState>(raw) : null;
}

export function clearOAuthState(res: NextResponse): NextResponse {
  res.cookies.delete(STATE_COOKIE);
  return res;
}

export function setMfaCookie(res: NextResponse, tokens: AuthTokens): void {
  res.cookies.set(MFA_COOKIE, seal(tokens, MFA_TTL), cookieOptions(MFA_TTL));
}

export function sealMfaToken(tokens: AuthTokens): string {
  return seal(tokens, MFA_TTL);
}

export function unsealMfaToken(token: string | undefined): AuthTokens | null {
  return token ? unseal<AuthTokens>(token) : null;
}

export function hasVerifiedFactor(tokens: AuthTokens): boolean {
  return (tokens.user.factors ?? []).some((f) => f.status === 'verified');
}

export function verifiedFactors(tokens: AuthTokens) {
  return (tokens.user.factors ?? [])
    .filter((f) => f.status === 'verified')
    .map((f) => ({ id: f.id, name: f.friendly_name ?? 'Autenticador' }));
}
