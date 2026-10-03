import { NextResponse, type NextRequest } from 'next/server';
import { env } from './env';
import { withExpiry, type AuthTokens } from './gotrue';
import { ApiError } from './http';
import { verifyAccessToken, type AccessClaims } from './jwt';

export const ACCESS_COOKIE = 'cs_at';
export const REFRESH_COOKIE = 'cs_rt';
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export type AuthContext = {
  token: string;
  claims: AccessClaims;
  mode: 'cookie' | 'bearer';
};

/** Desktop requests carry a Bearer token (or this header) and never use cookies. */
export function isDesktop(req: NextRequest): boolean {
  return req.headers.get('x-coopseat-client') === 'desktop' || req.headers.get('authorization')?.startsWith('Bearer ') === true;
}

/** Cookie-authenticated mutations must come from our own origin (CSRF). */
export function assertSameOrigin(req: NextRequest): void {
  if (isDesktop(req) || req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('origin');
  if (!origin || origin !== new URL(env.appUrl).origin) {
    throw new ApiError(403, 'bad_origin', 'Origem da requisição não permitida.');
  }
}

export async function getAuth(req: NextRequest): Promise<AuthContext | null> {
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    const claims = await verifyAccessToken(token);
    return claims ? { token, claims, mode: 'bearer' } : null;
  }
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  assertSameOrigin(req);
  const claims = await verifyAccessToken(token);
  return claims ? { token, claims, mode: 'cookie' } : null;
}

export async function requireAuth(req: NextRequest, opts: { aal2IfEnrolled?: boolean } = {}): Promise<AuthContext> {
  const auth = await getAuth(req);
  if (!auth) throw new ApiError(401, 'unauthenticated', 'Sua sessão expirou. Entre novamente.');
  if (opts.aal2IfEnrolled && auth.claims.aal !== 'aal2') {
    const { gotrue } = await import('./gotrue');
    const user = await gotrue.getUser(auth.token);
    if (user.factors?.some((f) => f.status === 'verified')) {
      throw new ApiError(403, 'mfa_required', 'Confirme o código de autenticação em duas etapas para continuar.');
    }
  }
  return auth;
}

export function setSessionCookies(res: NextResponse, tokens: AuthTokens): void {
  const secure = env.isProduction;
  const t = withExpiry(tokens);
  res.cookies.set(ACCESS_COOKIE, t.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(60, t.expires_at - Math.floor(Date.now() / 1000)),
  });
  res.cookies.set(REFRESH_COOKIE, t.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);
}

export function desktopSession(tokens: AuthTokens) {
  const t = withExpiry(tokens);
  return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at };
}

/** Desktop gets the tokens in the body; the browser gets httpOnly cookies. */
export function sessionResponse(req: NextRequest, tokens: AuthTokens, body: Record<string, unknown> = {}): NextResponse {
  if (isDesktop(req)) return NextResponse.json({ ...body, session: desktopSession(tokens) });
  const res = NextResponse.json(body);
  setSessionCookies(res, tokens);
  return res;
}
