import { env } from './env';
import { ApiError } from './http';

/** Verifies a Cloudflare Turnstile token. Skipped when TURNSTILE_SECRET_KEY is not set (local dev). */
export async function verifyCaptcha(
  token: string | undefined,
  ip: string,
): Promise<void> {
  const secret = env.turnstileSecret;
  if (!secret) {
    if (env.isProduction)
      throw new Error('TURNSTILE_SECRET_KEY é obrigatório em produção.');
    return;
  }
  if (!token) throw new ApiError(400, 'captcha_required');

  const body = new URLSearchParams({ secret, response: token });
  if (ip !== 'unknown') body.set('remoteip', ip);
  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body },
  );
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) throw new ApiError(400, 'captcha_failed');
}
