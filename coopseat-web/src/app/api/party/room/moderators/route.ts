import { NextResponse } from 'next/server';
import { moderatorSchema, profileRefSchema } from '@/lib/validation/party';
import { adminDb } from '@/prisma/db';
import { ApiError, readJson, route } from '@/server/http';
import {
  ensureRoom,
  getActiveBan,
  getActiveSession,
} from '@/server/party/access';
import { getPartyPolicy } from '@/server/party/policy';
import { roomView } from '@/server/party/room-view';
import {
  NO_STORE,
  partyCaller,
  profileByNickname,
  requireVerified,
} from '@/server/party/routes';
import { signalCommand } from '@/server/party/signal';

async function refreshLive(ownerId: string, profileId: string) {
  const session = await getActiveSession(ownerId, await getPartyPolicy());
  if (session)
    await signalCommand(session.id, { action: 'refresh', profileId });
}

/** Appoints (or updates the permissions of) a moderator. Moderators must have a verified identity. */
export const POST = route(async (req) => {
  const { nickname, ...perms } = await readJson(req, moderatorSchema);
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  await ensureRoom(viewer.profileId);
  const target = await profileByNickname(nickname);
  if (
    target.id === viewer.profileId ||
    (await getActiveBan(viewer.profileId, target.id))
  ) {
    throw new ApiError(400, 'party_target_invalid');
  }
  if (target.ageStatus !== 'VERIFIED')
    throw new ApiError(400, 'party_target_unverified');

  const db = await adminDb();
  const mods = db.orm.public.PartyRoomModerator;
  const existing = await mods
    .where({ roomId: viewer.profileId, profileId: target.id })
    .first();
  const values = Object.fromEntries(
    Object.entries(perms).filter(([, v]) => v !== undefined),
  );
  if (existing) {
    if (Object.keys(values).length > 0)
      await mods.where({ id: existing.id }).updateAll(values);
  } else {
    await mods.create({
      roomId: viewer.profileId,
      profileId: target.id,
      ...values,
    });
  }

  await refreshLive(viewer.profileId, target.id);
  return NextResponse.json(await roomView(viewer.profileId, viewer.nickname), {
    headers: NO_STORE,
  });
});

export const DELETE = route(async (req) => {
  const input = await readJson(req, profileRefSchema);
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  const db = await adminDb();
  await db.orm.public.PartyRoomModerator.where({
    roomId: viewer.profileId,
    profileId: input.profileId,
  }).deleteAll();
  await refreshLive(viewer.profileId, input.profileId);
  return NextResponse.json(await roomView(viewer.profileId, viewer.nickname), {
    headers: NO_STORE,
  });
});
