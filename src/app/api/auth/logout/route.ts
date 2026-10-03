import { NextResponse } from 'next/server';
import { gotrue } from '@/server/gotrue';
import { route } from '@/server/http';
import { ACCESS_COOKIE, assertSameOrigin, clearSessionCookies } from '@/server/session';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies.get(ACCESS_COOKIE)?.value;
  if (token) await gotrue.logout(token).catch(() => undefined);
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
});
