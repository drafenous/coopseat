import { NextResponse } from 'next/server';
import { approvalSchema } from '@/lib/validation/party';
import { ApiError, readJson, route } from '@/server/http';
import {
  actorFor,
  admitParticipant,
  assertCanLiftKick,
  getActiveBan,
  getActiveSession,
  logModeration,
} from '@/server/party/access';
import {
  NO_STORE,
  ownerOrThrow,
  partyCaller,
  requireVerified,
} from '@/server/party/routes';
import { signalCommand } from '@/server/party/signal';

type Ctx = { params: Promise<{ nickname: string }> };

/**
 * Approves or denies someone waiting in the lobby. Admission is recorded here before the signal
 * server is told, so the guest's token refresh comes back `admitted` and the queue drops as soon
 * as that command is accepted.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const [input, params] = await Promise.all([
    readJson(req, approvalSchema),
    ctx.params,
  ]);
  const [{ viewer }, owner] = await Promise.all([
    partyCaller(req),
    ownerOrThrow(params.nickname),
  ]);
  requireVerified(viewer);

  const [actor, session, ban] = await Promise.all([
    actorFor(owner.id, viewer.profileId),
    getActiveSession(owner.id),
    input.approve
      ? getActiveBan(owner.id, input.profileId)
      : Promise.resolve(null),
  ]);
  if (!actor?.perms.approve) throw new ApiError(403, 'party_forbidden');
  if (!session) throw new ApiError(409, 'party_no_session');
  if (input.approve) {
    if (ban) throw new ApiError(400, 'party_target_invalid');
    await assertCanLiftKick(actor, owner.id, session.id, input.profileId);
    await admitParticipant(session.id, input.profileId);
  }

  const action = input.approve ? 'approve' : 'deny';
  await Promise.all([
    signalCommand(
      session.id,
      input.approve
        ? { action: 'approve', profileId: input.profileId }
        : { action: 'deny', profileId: input.profileId },
    ),
    logModeration({
      roomId: owner.id,
      sessionId: session.id,
      actorId: viewer.profileId,
      targetId: input.profileId,
      action,
    }),
  ]);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
});
