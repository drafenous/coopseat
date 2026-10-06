import { NextResponse } from 'next/server';
import { profileRefSchema, whitelistEntrySchema } from '@/lib/validation/party';
import { adminDb } from '@/prisma/db';
import { ApiError, readJson, route } from '@/server/http';
import { ensureRoom, getActiveSession } from '@/server/party/access';
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

/** Adds or updates someone on the owner's allow list (immediate access, optionally streaming). */
export const POST = route(async (req) => {
  const input = await readJson(req, whitelistEntrySchema);
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  await ensureRoom(viewer.profileId);
  const target = await profileByNickname(input.nickname);
  if (target.id === viewer.profileId)
    throw new ApiError(400, 'party_target_invalid');

  const db = await adminDb();
  const list = db.orm.public.PartyRoomWhitelist;
  const existing = await list
    .where({ roomId: viewer.profileId, profileId: target.id })
    .first();
  if (existing)
    await list
      .where({ id: existing.id })
      .updateAll({ canStream: input.canStream });
  else
    await list.create({
      roomId: viewer.profileId,
      profileId: target.id,
      canStream: input.canStream,
    });

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
  await db.orm.public.PartyRoomWhitelist.where({
    roomId: viewer.profileId,
    profileId: input.profileId,
  }).deleteAll();
  await refreshLive(viewer.profileId, input.profileId);
  return NextResponse.json(await roomView(viewer.profileId, viewer.nickname), {
    headers: NO_STORE,
  });
});
