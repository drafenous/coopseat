import { type NextRequest, NextResponse } from 'next/server';
import { discordFailureCode } from '@/server/discord';
import { GoTrueError, gotrue, type AuthTokens } from '@/server/gotrue';
import { completeOAuth, oauthErrorPage } from '@/server/oauth-complete';
import { clearOAuthState, readOAuthState } from '@/server/oauth-state';

/** GoTrue returns here with `?code=` after Discord. The code is GoTrue's, not Discord's. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = readOAuthState(req);
  const ours = state?.provider === 'discord';
  const finish = (res: NextResponse) => (ours ? clearOAuthState(res) : res);

  if (!ours || !state) return finish(oauthErrorPage('login_expired'));

  const linking = state.mode === 'link-web' || state.mode === 'link-desktop';
  if (params.get('error')) {
    return finish(
      oauthErrorPage(
        discordFailureCode(
          params.get('error_code') ?? params.get('error'),
          linking,
        ),
      ),
    );
  }

  const code = params.get('code');
  if (!code) return finish(oauthErrorPage('provider_bad_response'));

  let tokens: AuthTokens;
  try {
    tokens = await gotrue.pkceGrant(code, state.verifier);
    // The PKCE payload's user is not guaranteed to include factors. Reload so 2FA still gates sign-in.
    tokens = { ...tokens, user: await gotrue.getUser(tokens.access_token) };
  } catch (err) {
    const failure = err instanceof GoTrueError ? err.code : undefined;
    return finish(oauthErrorPage(discordFailureCode(failure, linking)));
  }
  return finish(await completeOAuth(state, tokens));
}
