import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, route } from '@/server/http';
import { decideAccess, getRoom } from '@/server/party/access';
import { accessPayload } from '@/server/party/join';
import { NO_STORE, ownerOrThrow, partyCaller } from '@/server/party/routes';

type Ctx = { params: Promise<{ nickname: string }> };

const refreshSchema = z.object({ sessionId: z.uuid() }).strict();

/**
 * Renews the room token for the same session. Never takes a password: someone who lost admission
 * (kicked, session changed) gets a non-admitted state and must go through the join flow again.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { sessionId } = await readJson(req, refreshSchema);
  const { nickname } = await ctx.params;
  const [{ viewer }, owner] = await Promise.all([
    partyCaller(req, 'party_join'),
    ownerOrThrow(nickname),
  ]);
  const room = getRoom(owner.id);
  const result = await decideAccess({
    viewer,
    owner,
    room,
    expectedSessionId: sessionId,
  });
  return NextResponse.json(await accessPayload(result, owner, await room), {
    headers: NO_STORE,
  });
});
