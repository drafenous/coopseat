import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readJson, route } from '@/server/http';
import { decideAccess } from '@/server/party/access';
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
  const { viewer } = await partyCaller(req, 'party_join');
  const owner = await ownerOrThrow((await ctx.params).nickname);
  const result = await decideAccess({ viewer, owner, expectedSessionId: sessionId });
  return NextResponse.json(await accessPayload(result, owner), { headers: NO_STORE });
});
