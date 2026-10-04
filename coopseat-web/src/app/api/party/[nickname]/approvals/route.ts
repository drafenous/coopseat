import { NextResponse } from 'next/server';
import { approvalSchema } from '@/lib/validation/party';
import { ApiError, readJson, route } from '@/server/http';
import { actorFor, admitParticipant, getActiveBan, getActiveSession, logModeration } from '@/server/party/access';
import { getPartyPolicy } from '@/server/party/policy';
import { NO_STORE, ownerOrThrow, partyCaller, requireVerified } from '@/server/party/routes';
import { signalCommand } from '@/server/party/signal';

type Ctx = { params: Promise<{ nickname: string }> };

/**
 * Approves or denies someone waiting in the lobby. Admission is recorded here (not in the signal
 * server), so the approved user's next token refresh comes back `admitted`.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const input = await readJson(req, approvalSchema);
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  const owner = await ownerOrThrow((await ctx.params).nickname);
  const actor = await actorFor(owner.id, viewer.profileId);
  if (!actor?.perms.approve) throw new ApiError(403, 'party_forbidden');
  const session = await getActiveSession(owner.id, await getPartyPolicy());
  if (!session) throw new ApiError(409, 'party_no_session');

  if (input.approve) {
    if (await getActiveBan(owner.id, input.profileId)) throw new ApiError(400, 'party_target_invalid');
    await admitParticipant(session.id, input.profileId);
    await signalCommand(session.id, { action: 'approve', profileId: input.profileId });
  } else {
    await signalCommand(session.id, { action: 'deny', profileId: input.profileId });
  }
  await logModeration({
    roomId: owner.id,
    sessionId: session.id,
    actorId: viewer.profileId,
    targetId: input.profileId,
    action: input.approve ? 'approve' : 'deny',
  });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
});
