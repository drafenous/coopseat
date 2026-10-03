import { NextResponse, type NextRequest } from 'next/server';
import type { ErrorCode } from '@/i18n/dictionaries';
import { safeEqual } from '@/server/crypto';
import { env } from '@/server/env';
import { googleExchangeCode } from '@/server/google';
import { GoTrueError, gotrue, type AuthTokens } from '@/server/gotrue';
import {
  clearOAuthState,
  hasVerifiedFactor,
  readOAuthState,
  sealMfaToken,
  setMfaCookie,
} from '@/server/oauth-state';
import { ensureProfile } from '@/server/profiles';
import { setSessionCookies } from '@/server/session';
import { createTicket } from '@/server/tickets';

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, env.appUrl), 303);
}

function openApp(deepLink: string) {
  return redirect(`/auth/open-app?to=${encodeURIComponent(deepLink)}`);
}

function errorPage(code: ErrorCode) {
  return redirect(`/auth/error?code=${code}`);
}

function avatarOf(tokens: AuthTokens): string | null {
  for (const identity of tokens.user.identities ?? []) {
    const url = identity.identity_data?.avatar_url ?? identity.identity_data?.picture;
    if (typeof url === 'string') return url;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = readOAuthState(req);
  const finish = clearOAuthState;

  if (!state || !safeEqual(params.get('state') ?? '', state.state)) return finish(errorPage('login_expired'));

  if (params.get('error')) return finish(errorPage('provider_refused'));

  const code = params.get('code');
  if (!code) return finish(errorPage('provider_bad_response'));

  let google: Awaited<ReturnType<typeof googleExchangeCode>>;
  try {
    google = await googleExchangeCode(code, state.verifier);
  } catch {
    return finish(errorPage('provider_bad_response'));
  }

  let tokens: AuthTokens;
  try {
    tokens = await gotrue.idTokenGrant({
      provider: 'google',
      idToken: google.idToken,
      accessToken: google.accessToken,
      nonce: state.nonce,
      linkTo: state.linkTo,
    });
  } catch (err) {
    if (err instanceof GoTrueError && err.code === 'identity_already_exists') {
      return finish(errorPage('provider_already_linked'));
    }
    return finish(errorPage(state.linkTo ? 'link_failed' : 'login_failed'));
  }
  await ensureProfile(tokens.user.id, avatarOf(tokens));

  switch (state.mode) {
    case 'desktop': {
      const payload = hasVerifiedFactor(tokens)
        ? { mfaRequired: true, mfaToken: sealMfaToken(tokens) }
        : { tokens };
      const ticket = await createTicket('desktop_login', payload, state.desktopChallenge);
      return finish(openApp(`coopseat://auth/callback?ticket=${ticket}`));
    }
    case 'link-desktop': {
      // The desktop keeps its own session; the one minted by the link flow is discarded.
      await gotrue.logout(tokens.access_token).catch(() => undefined);
      return finish(openApp('coopseat://auth/linked'));
    }
    case 'link-web': {
      const res = redirect('/account?linked=1');
      setSessionCookies(res, tokens);
      return finish(res);
    }
    case 'web': {
      if (hasVerifiedFactor(tokens)) {
        const res = redirect(`/login/2fa?next=${encodeURIComponent(state.next ?? '/account')}`);
        setMfaCookie(res, tokens);
        return finish(res);
      }
      const res = redirect(state.next ?? '/account');
      setSessionCookies(res, tokens);
      return finish(res);
    }
  }
}
