import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/server/env';
import { gotrue } from '@/server/gotrue';
import { setSessionCookies } from '@/server/session';

const TYPES = new Set(['signup', 'email', 'recovery', 'email_change', 'magiclink', 'invite']);

export async function GET(req: NextRequest) {
  const tokenHash = req.nextUrl.searchParams.get('token_hash');
  const type = req.nextUrl.searchParams.get('type') ?? '';
  const target = (path: string) => NextResponse.redirect(new URL(path, env.appUrl), 303);

  if (!tokenHash || !TYPES.has(type)) return target('/auth/confirmado?erro=link');

  try {
    const result = await gotrue.verifyOtp(type, tokenHash);
    const res =
      type === 'recovery'
        ? target('/redefinir-senha')
        : target(`/auth/confirmado?tipo=${encodeURIComponent(type)}`);
    // Secure email change needs both addresses confirmed; the first click returns no session.
    if (result && 'access_token' in result && result.access_token) setSessionCookies(res, result);
    return res;
  } catch {
    return target('/auth/confirmado?erro=expirado');
  }
}
