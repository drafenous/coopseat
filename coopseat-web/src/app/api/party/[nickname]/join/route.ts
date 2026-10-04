import { NextResponse } from 'next/server';
import { joinSchema } from '@/lib/validation/party';
import { readJson, route } from '@/server/http';
import { decideAccess } from '@/server/party/access';
import { accessPayload } from '@/server/party/join';
import { NO_STORE, ownerOrThrow, partyCaller } from '@/server/party/routes';

type Ctx = { params: Promise<{ nickname: string }> };

/**
 * Entry point for a room link. Also used to refresh the room token (pass `sessionId`): access is
 * re-evaluated each time, so bans, sanctions and role changes apply within one token lifetime.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const input = await readJson(req, joinSchema);
  const { viewer } = await partyCaller(req, 'party_join');
  const owner = await ownerOrThrow((await ctx.params).nickname);
  const result = await decideAccess({ viewer, owner, password: input.password, expectedSessionId: input.sessionId });
  return NextResponse.json(await accessPayload(result, owner), { headers: NO_STORE });
});
