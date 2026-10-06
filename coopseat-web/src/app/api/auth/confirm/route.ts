import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { setSessionCookies } from '@/server/session';

const TYPES = new Set([
  'signup',
  'email',
  'recovery',
  'email_change',
  'magiclink',
  'invite',
]);

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type') ?? '';
  // The trailing "#" replaces any fragment GoTrue appended (it may carry tokens).
  const target = (path: string) =>
    NextResponse.redirect(`${new URL(path, env.appUrl)}#`, 303);

  if (!tokenHash) {
    // Supabase's default email template confirms on GoTrue's own /verify and only then
    // redirects here (with ?flow=signup from our redirect_to, or ?error=... on failure).
    if (params.has('error') || params.has('error_code'))
      return target('/auth/confirmed?error=expired');
    if (params.get('flow') === 'signup')
      return target('/auth/confirmed?type=signup');
    return target('/auth/confirmed?error=link');
  }
  if (!TYPES.has(type)) return target('/auth/confirmed?error=link');

  try {
    const result = await gotrue.verifyOtp(type, tokenHash);
    const res =
      type === 'recovery'
        ? target('/reset-password')
        : target(`/auth/confirmed?type=${encodeURIComponent(type)}`);
    // Secure email change needs both addresses confirmed; the first click returns no session.
    if (result && 'access_token' in result && result.access_token)
      setSessionCookies(res, result);
    return res;
  } catch {
    return target('/auth/confirmed?error=expired');
  }
}
