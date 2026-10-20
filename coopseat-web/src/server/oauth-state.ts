import { NextResponse, type NextRequest } from 'next/server';
import type { AccessClaims } from './jwt';
import type { OAuthProvider } from '@/lib/validation/account';
import { pkceChallenge, randomToken, seal, sha256Hex, unseal } from './crypto';
import { discordAuthorizeUrl, discordCallbackUrl } from './discord';
import { env } from './env';
import { gotrue, type AuthTokens } from './gotrue';
import { googleAuthorizeUrl } from './google';

const STATE_COOKIE = 'cs_oauth';
export const MFA_COOKIE = 'cs_mfa';
export const STEPUP_COOKIE = 'cs_su';
const STATE_TTL = 600;
export const MFA_TTL = 300;
const STEPUP_TTL = 60 * 60 * 24 * 30;

export type StepUpProof = { sub: string; sid: string };

export type OAuthMode = 'web' | 'desktop' | 'link-web' | 'link-desktop';

export type OAuthState = {
  provider: OAuthProvider;
  /** PKCE verifier. Google exchanges it with Google; Discord exchanges GoTrue's auth code. */
  verifier: string;
  /** Echoed back by Google; must match to accept the callback (CSRF). Empty for Discord. */
  state: string;
  /** Raw nonce; Google receives its sha256 and GoTrue checks it against the id_token. */
  nonce: string;
  mode: OAuthMode;
  next?: string;
  /** PKCE challenge from the desktop app, bound to the login ticket. */
  desktopChallenge?: string;
  /** Access token of the account receiving the identity (Google link modes). */
  linkTo?: string;
};

export type OAuthFlow = Omit<
  OAuthState,
  'provider' | 'verifier' | 'state' | 'nonce'
>;

/** Redirects the browser to the provider and remembers the flow in a sealed cookie. */
export function startOAuth(
  provider: OAuthProvider,
  flow: OAuthFlow,
): Promise<NextResponse> {
  if (provider === 'discord') return startDiscordOAuth(flow);
  return Promise.resolve(startGoogleOAuth(flow));
}

/** Redirects the browser to Google and remembers the flow in a sealed cookie. */
export function startGoogleOAuth(flow: OAuthFlow): NextResponse {
  const verifier = randomToken(48);
  const state = randomToken(24);
  const nonce = randomToken(24);
  const url = googleAuthorizeUrl({
    state,
    nonceHash: sha256Hex(nonce),
    codeChallenge: pkceChallenge(verifier),
  });
  const res = NextResponse.redirect(url, 303);
  setOAuthState(res, { ...flow, provider: 'google', verifier, state, nonce });
  return res;
}

/**
 * Discord sign-in redirects to GoTrue, which redirects to Discord.
 * Linking asks GoTrue for that URL while the user's access token is still valid,
 * so the identity is attached to the signed-in account. The token is not kept in the cookie.
 */
export async function startDiscordOAuth(flow: OAuthFlow): Promise<NextResponse> {
  const verifier = randomToken(48);
  const codeChallenge = pkceChallenge(verifier);
  const redirectTo = discordCallbackUrl();
  const url = flow.linkTo
    ? await gotrue.identityAuthorizeUrl({
        token: flow.linkTo,
        provider: 'discord',
        redirectTo,
        codeChallenge,
      })
    : discordAuthorizeUrl({ codeChallenge, redirectTo });
  const res = NextResponse.redirect(url, 303);
  setOAuthState(res, {
    provider: 'discord',
    verifier,
    state: '',
    nonce: '',
    mode: flow.mode,
    next: flow.next,
    desktopChallenge: flow.desktopChallenge,
  });
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
  res.cookies.set(
    STATE_COOKIE,
    seal(state, STATE_TTL),
    cookieOptions(STATE_TTL),
  );
}

export function readOAuthState(req: NextRequest): OAuthState | null {
  const raw = req.cookies.get(STATE_COOKIE)?.value;
  return raw ? unseal<OAuthState>(raw) : null;
}

export function clearOAuthState(res: NextResponse): NextResponse {
  res.cookies.delete(STATE_COOKIE);
  return res;
}

/**
 * A browser drops any cookie over 4096 bytes. The password grant includes the
 * whole user (identities, metadata), and sealing that with the tokens crosses
 * the limit, so the second step never sees the session and sends the person
 * back to login. Keep only what the challenge needs.
 */
function mfaPending(tokens: AuthTokens): AuthTokens {
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    ...(tokens.expires_at === undefined ? {} : { expires_at: tokens.expires_at }),
    user: {
      id: tokens.user.id,
      factors: tokens.user.factors?.map((factor) => ({
        id: factor.id,
        factor_type: factor.factor_type,
        status: factor.status,
        friendly_name: factor.friendly_name,
      })),
    },
  };
}

export function setMfaCookie(res: NextResponse, tokens: AuthTokens): void {
  res.cookies.set(
    MFA_COOKIE,
    seal(mfaPending(tokens), MFA_TTL),
    cookieOptions(MFA_TTL),
  );
}

export function sealMfaToken(tokens: AuthTokens): string {
  return seal(mfaPending(tokens), MFA_TTL);
}

export function unsealMfaToken(token: string | undefined): AuthTokens | null {
  return token ? unseal<AuthTokens>(token) : null;
}

/** Proof that this session passed a security code. Bound to the GoTrue session id. */
export function sealStepUp(sub: string, sid: string): string {
  return seal({ sub, sid } satisfies StepUpProof, STEPUP_TTL);
}

export function readStepUp(token: string | undefined): StepUpProof | null {
  if (!token) return null;
  const proof = unseal<StepUpProof>(token);
  if (!proof || typeof proof.sub !== 'string' || typeof proof.sid !== 'string')
    return null;
  return proof;
}

/** A recovery-code login cannot mint an aal2 JWT, so the sealed proof stands in for it. */
export function elevateClaims(
  claims: AccessClaims,
  token: string | undefined,
): AccessClaims {
  if (claims.aal === 'aal2' || !claims.session_id) return claims;
  const proof = readStepUp(token);
  if (!proof || proof.sub !== claims.sub || proof.sid !== claims.session_id)
    return claims;
  return { ...claims, aal: 'aal2' };
}

export function setStepUpCookie(res: NextResponse, token: string): void {
  res.cookies.set(STEPUP_COOKIE, token, cookieOptions(STEPUP_TTL));
}

export function hasVerifiedFactor(tokens: AuthTokens): boolean {
  return (tokens.user.factors ?? []).some((f) => f.status === 'verified');
}

export function verifiedFactors(tokens: AuthTokens) {
  return (tokens.user.factors ?? [])
    .filter((f) => f.status === 'verified')
    .map((f) => ({ id: f.id, name: f.friendly_name ?? 'Autenticador' }));
}
