import { NextResponse } from 'next/server';
import {
  isRoomPasswordFilter,
  isRoomStatusFilter,
  isRoomVisibilityFilter,
} from '@coopseat/ui/party-protocol';
import { ApiError, clientIp, route } from '@/server/http';
import { listRooms } from '@/server/party/directory';
import { NO_STORE } from '@/server/party/routes';
import { rateLimit } from '@/server/rate-limit';

function parseVisibility(raw: string[]) {
  const tokens = raw
    .flatMap((part) => part.split(','))
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === 'any'))
    return undefined;
  const picked: Array<'protected' | 'private' | 'public'> = [];
  for (const token of tokens) {
    if (token === 'any' || !isRoomVisibilityFilter(token))
      throw new ApiError(400, 'invalid_input');
    if (!picked.includes(token)) picked.push(token);
  }
  return picked;
}

/** Public directory of rooms the owner chose to list. Open is the default. */
export const GET = route(async (req) => {
  await rateLimit('party_directory', clientIp(req));
  const raw = req.nextUrl.searchParams.get('status') ?? 'open';
  if (!isRoomStatusFilter(raw)) throw new ApiError(400, 'invalid_input');
  const rawPage = req.nextUrl.searchParams.get('page');
  const page = rawPage == null ? 1 : Number(rawPage);
  if (!Number.isInteger(page) || page < 1 || page > 10_000)
    throw new ApiError(400, 'invalid_input');
  const password = req.nextUrl.searchParams.get('password') ?? 'any';
  if (!isRoomPasswordFilter(password)) throw new ApiError(400, 'invalid_input');
  const visibility = parseVisibility(req.nextUrl.searchParams.getAll('visibility'));
  return NextResponse.json(await listRooms(raw, page, { password, visibility }), {
    headers: NO_STORE,
  });
});
