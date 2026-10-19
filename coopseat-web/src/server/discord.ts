import type { ErrorCode } from '@/i18n/dictionaries';
import { env } from './env';

/**
 * Discord OAuth is not OpenID Connect: there is no id_token for GoTrue's
 * `id_token` grant. The BFF starts GoTrue's own PKCE flow and exchanges the
 * auth code it returns. GoTrue already requests `email` and `identify`; its
 * `scopes` query is comma-separated and appended, so we do not send one.
 */
export const discordCallbackUrl = () =>
  `${env.appUrl}/api/auth/callback/discord`;

export function discordAuthorizeUrl(opts: {
  codeChallenge: string;
  redirectTo?: string;
}) {
  const url = new URL(`${env.supabaseUrl}/auth/v1/authorize`);
  url.search = new URLSearchParams({
    provider: 'discord',
    redirect_to: opts.redirectTo ?? discordCallbackUrl(),
    code_challenge: opts.codeChallenge,
    code_challenge_method: 's256',
  }).toString();
  return url.toString();
}

/** Maps a GoTrue redirect or PKCE error onto a page the auth error screen knows. */
export function discordFailureCode(
  code: string | null | undefined,
  linking: boolean,
): ErrorCode {
  if (code === 'identity_already_exists') return 'provider_already_linked';
  if (code === 'email_exists' || code === 'user_already_exists')
    return 'email_exists';
  if (code === 'access_denied') return 'provider_refused';
  if (code === 'flow_state_expired' || code === 'flow_state_not_found')
    return 'login_expired';
  return linking ? 'link_failed' : 'login_failed';
}
