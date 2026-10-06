import { env } from './env';

/** Google OAuth 2.0 / OpenID Connect, run by the BFF so Google shows our domain instead of Supabase's. */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const googleRedirectUri = () => `${env.appUrl}/api/auth/callback`;

/** `nonceHash` is sha256(nonce) in hex: GoTrue hashes the raw nonce and compares it with the id_token claim. */
export function googleAuthorizeUrl(opts: {
  state: string;
  nonceHash: string;
  codeChallenge: string;
}) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: opts.state,
    nonce: opts.nonceHash,
    code_challenge: opts.codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return url.toString();
}

export async function googleExchangeCode(code: string, codeVerifier: string) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      code_verifier: codeVerifier,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as {
    id_token?: string;
    access_token?: string;
    error?: string;
  };
  if (!res.ok || !data.id_token)
    throw new Error(
      `Google token exchange failed: ${data.error ?? res.status}`,
    );
  return { idToken: data.id_token, accessToken: data.access_token };
}
