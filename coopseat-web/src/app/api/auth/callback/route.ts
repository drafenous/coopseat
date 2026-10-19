import type { NextRequest } from 'next/server';
import { safeEqual } from '@/server/crypto';
import { googleExchangeCode } from '@/server/google';
import { GoTrueError, gotrue, type AuthTokens } from '@/server/gotrue';
import { completeOAuth, oauthErrorPage } from '@/server/oauth-complete';
import { clearOAuthState, readOAuthState } from '@/server/oauth-state';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = readOAuthState(req);
  const finish = clearOAuthState;

  // A Discord flow uses the same cookie. Don't wipe it from the Google callback.
  if (state?.provider === 'discord') return oauthErrorPage('login_expired');

  if (
    !state ||
    (state.provider && state.provider !== 'google') ||
    !safeEqual(params.get('state') ?? '', state.state)
  )
    return finish(oauthErrorPage('login_expired'));

  if (params.get('error')) return finish(oauthErrorPage('provider_refused'));

  const code = params.get('code');
  if (!code) return finish(oauthErrorPage('provider_bad_response'));

  let google: Awaited<ReturnType<typeof googleExchangeCode>>;
  try {
    google = await googleExchangeCode(code, state.verifier);
  } catch {
    return finish(oauthErrorPage('provider_bad_response'));
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
      return finish(oauthErrorPage('provider_already_linked'));
    }
    return finish(
      oauthErrorPage(state.linkTo ? 'link_failed' : 'login_failed'),
    );
  }
  return finish(await completeOAuth(state, tokens));
}
