import { NextResponse } from 'next/server';
import { route } from '@/server/http';
import { openLiveSession } from '@/server/party/access';
import { accessPayload } from '@/server/party/join';
import { NO_STORE, ownerOrThrow, partyCaller } from '@/server/party/routes';

type Ctx = { params: Promise<{ nickname: string }> };

/**
 * Opens the named room's session, or returns the one already live. The owner and anyone with a
 * durable stream grant on the allow list may do this while the owner is offline. Password and
 * approval guests cannot create a session.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { nickname } = await ctx.params;
  const [{ viewer }, owner] = await Promise.all([
    partyCaller(req, 'party_session'),
    ownerOrThrow(nickname),
  ]);
  const result = await openLiveSession({ viewer, owner });
  return NextResponse.json(await accessPayload(result, owner), {
    headers: NO_STORE,
  });
});
