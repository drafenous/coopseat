import { NextResponse } from 'next/server';
import { banSchema, profileRefSchema } from '@/lib/validation/party';
import { adminDb } from '@/prisma/db';
import { ApiError, readJson, route } from '@/server/http';
import { actorFor, assertCanTarget, getActiveSession, logModeration, markRemoved, type Actor } from '@/server/party/access';
import { getPartyPolicy } from '@/server/party/policy';
import { NO_STORE, nicknames, ownerOrThrow, partyCaller, requireVerified } from '@/server/party/routes';
import { signalCommand } from '@/server/party/signal';

type Ctx = { params: Promise<{ nickname: string }> };

async function banner(req: Parameters<typeof partyCaller>[0], ctx: Ctx) {
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  const owner = await ownerOrThrow((await ctx.params).nickname);
  const actor = await actorFor(owner.id, viewer.profileId);
  if (!actor?.perms.ban) throw new ApiError(403, 'party_forbidden');
  return { viewer, owner, actor: actor as Actor };
}

async function list(roomId: string) {
  const db = await adminDb();
  const now = Date.now();
  const bans = (await db.orm.public.PartyRoomBan.where({ roomId }).all()).filter(
    (b) => !b.expiresAt || Date.parse(b.expiresAt) > now,
  );
  const names = await nicknames(bans.map((b) => b.profileId));
  return {
    bans: bans.map((b) => ({
      profileId: b.profileId,
      nickname: names.get(b.profileId) ?? '',
      reason: b.reason,
      expiresAt: b.expiresAt,
      createdAt: b.createdAt,
    })),
  };
}

export const GET = route<Ctx>(async (req, ctx) => {
  const { owner } = await banner(req, ctx);
  return NextResponse.json(await list(owner.id), { headers: NO_STORE });
});

/** Bans someone from the room (persisted across sessions) and removes them from the live session. */
export const POST = route<Ctx>(async (req, ctx) => {
  const input = await readJson(req, banSchema);
  const { viewer, owner, actor } = await banner(req, ctx);
  await assertCanTarget(owner.id, actor, input.profileId);

  const db = await adminDb();
  const expiresAt = input.hours ? new Date(Date.now() + input.hours * 3600_000).toISOString() : null;
  await db.orm.public.PartyRoomBan.where({ roomId: owner.id, profileId: input.profileId }).deleteAll();
  await db.orm.public.PartyRoomBan.create({
    roomId: owner.id,
    profileId: input.profileId,
    reason: input.reason || null,
    bannedBy: viewer.profileId,
    expiresAt,
  });
  await db.orm.public.PartyRoomWhitelist.where({ roomId: owner.id, profileId: input.profileId }).deleteAll();
  if (actor.role === 'owner') {
    await db.orm.public.PartyRoomModerator.where({ roomId: owner.id, profileId: input.profileId }).deleteAll();
  }

  const session = await getActiveSession(owner.id, await getPartyPolicy());
  if (session) {
    await markRemoved(session.id, input.profileId, 'ban', viewer.profileId);
    await signalCommand(session.id, { action: 'remove', profileId: input.profileId, reason: 'ban' });
  }
  await logModeration({
    roomId: owner.id,
    sessionId: session?.id,
    actorId: viewer.profileId,
    targetId: input.profileId,
    action: 'ban',
    detail: expiresAt ? `until ${expiresAt}` : 'permanent',
  });
  return NextResponse.json(await list(owner.id), { headers: NO_STORE });
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const input = await readJson(req, profileRefSchema);
  const { viewer, owner } = await banner(req, ctx);
  const db = await adminDb();
  await db.orm.public.PartyRoomBan.where({ roomId: owner.id, profileId: input.profileId }).deleteAll();
  await logModeration({ roomId: owner.id, actorId: viewer.profileId, targetId: input.profileId, action: 'unban' });
  return NextResponse.json(await list(owner.id), { headers: NO_STORE });
});
