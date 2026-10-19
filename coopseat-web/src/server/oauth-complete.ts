import { NextResponse } from 'next/server';
import type { ErrorCode } from '@/i18n/dictionaries';
import { env } from './env';
import { gotrue, type AuthTokens } from './gotrue';
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

/** Session, 2FA, desktop ticket or link handoff once a provider has minted tokens. */
export async function completeOAuth(
  state: OAuthState,
  tokens: AuthTokens,
): Promise<NextResponse> {
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
