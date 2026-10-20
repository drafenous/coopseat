import { NextResponse } from 'next/server';
import type { ErrorCode } from '@/i18n/dictionaries';
import { assertLegitimateEmail } from './email-legitimacy';
import { env } from './env';
import { gotrue, type AuthTokens } from './gotrue';
import { ApiError } from './http';
import {
  hasVerifiedFactor,
  sealMfaToken,
  setMfaCookie,
  type OAuthState,
} from './oauth-state';
import { ensureProfile } from './profiles';
import { setSessionCookies } from './session';
import { createTicket } from './tickets';

export function oauthRedirect(path: string) {
  return NextResponse.redirect(new URL(path, env.appUrl), 303);
}

export function oauthErrorPage(code: ErrorCode) {
  return oauthRedirect(`/auth/error?code=${code}`);
}

function openApp(deepLink: string) {
  return oauthRedirect(`/auth/open-app?to=${encodeURIComponent(deepLink)}`);
}

function avatarOf(tokens: AuthTokens): string | null {
  for (const identity of tokens.user.identities ?? []) {
    const url =
      identity.identity_data?.avatar_url ?? identity.identity_data?.picture;
    if (typeof url === 'string') return url;
  }
  return null;
}

const FRESH_ACCOUNT_MS = 2 * 60 * 1000;

function isFreshAccount(createdAt: string | undefined): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  const age = Date.now() - created;
  return age >= -30_000 && age <= FRESH_ACCOUNT_MS;
}

/** Drops a provider signup that just used a disposable or undeliverable address. */
async function rejectFreshIllegitimateSignup(
  tokens: AuthTokens,
): Promise<NextResponse | undefined> {
  const email = tokens.user.email;
  if (!email || !isFreshAccount(tokens.user.created_at)) return;
  try {
    await assertLegitimateEmail(email);
  } catch (err) {
    if (
      !(err instanceof ApiError) ||
      (err.code !== 'email_disposable' && err.code !== 'email_undeliverable')
    )
      throw err;
    await gotrue.admin
      .deleteUser(tokens.user.id)
      .catch((e) => console.error('rollback oauth signup failed', e));
    return oauthErrorPage(err.code);
  }
}

/** Session, 2FA, desktop ticket or link handoff once a provider has minted tokens. */
export async function completeOAuth(
  state: OAuthState,
  tokens: AuthTokens,
): Promise<NextResponse> {
  if (state.mode === 'web' || state.mode === 'desktop') {
    const rejected = await rejectFreshIllegitimateSignup(tokens);
    if (rejected) return rejected;
  }

  await ensureProfile(tokens.user.id, avatarOf(tokens));

  switch (state.mode) {
    case 'desktop': {
      const payload = hasVerifiedFactor(tokens)
        ? { mfaRequired: true, mfaToken: sealMfaToken(tokens) }
        : { tokens };
      const ticket = await createTicket(
        'desktop_login',
        payload,
        state.desktopChallenge,
      );
      return openApp(`coopseat://auth/callback?ticket=${ticket}`);
    }
    case 'link-desktop': {
      // The desktop keeps its own session; the one minted by the link flow is discarded.
      await gotrue.logout(tokens.access_token).catch(() => undefined);
      return openApp('coopseat://auth/linked');
    }
    case 'link-web': {
      const res = oauthRedirect('/account?linked=1');
      setSessionCookies(res, tokens);
      return res;
    }
    case 'web': {
      if (hasVerifiedFactor(tokens)) {
        const res = oauthRedirect(
          `/login/2fa?next=${encodeURIComponent(state.next ?? '/account')}`,
        );
        setMfaCookie(res, tokens);
        return res;
      }
      const res = oauthRedirect(state.next ?? '/account');
      setSessionCookies(res, tokens);
      return res;
    }
  }
}
