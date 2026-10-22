import { NextResponse } from 'next/server';
import { clientIp, route } from '@/server/http';
import { lookupRoom } from '@/server/party/directory';
import { NO_STORE } from '@/server/party/routes';
import { rateLimit } from '@/server/rate-limit';

/** One room by nickname or link, including rooms that are not in the public list. */
export const GET = route(async (req) => {
  await rateLimit('party_directory', clientIp(req));
  const room = await lookupRoom(req.nextUrl.searchParams.get('q') ?? '');
  return NextResponse.json({ room }, { headers: NO_STORE });
});
