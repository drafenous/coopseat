import { NextResponse } from 'next/server';
import { updateRoomSchema } from '@/lib/validation/party';
import { adminDb } from '@/prisma/db';
import { ApiError, readJson, route } from '@/server/http';
import { ensureRoom } from '@/server/party/access';
import { hashRoomPassword } from '@/server/party/password';
import { roomView } from '@/server/party/room-view';
import { NO_STORE, partyCaller, requireVerified } from '@/server/party/routes';

/** The caller's own room (every verified user has exactly one, created on first access). */
export const GET = route(async (req) => {
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  return NextResponse.json(await roomView(viewer.profileId, viewer.nickname), {
    headers: NO_STORE,
  });
});

export const PATCH = route(async (req) => {
  const input = await readJson(req, updateRoomSchema);
  const { viewer } = await partyCaller(req);
  requireVerified(viewer);
  const room = await ensureRoom(viewer.profileId);

  const passwordHash =
    input.password === undefined
      ? room.passwordHash
      : input.password === null
        ? null
        : await hashRoomPassword(input.password);
  const next = {
    passwordHash,
    requireApproval: input.requireApproval ?? room.requireApproval,
    whitelistEnabled: input.whitelistEnabled ?? room.whitelistEnabled,
    defaultLayout: input.defaultLayout ?? room.defaultLayout,
  };
  if (!next.passwordHash && !next.requireApproval && !next.whitelistEnabled) {
    throw new ApiError(400, 'party_protection_required');
  }

  const db = await adminDb();
  await db.orm.public.PartyRoom.where({ ownerId: viewer.profileId }).updateAll(
    next,
  );
  return NextResponse.json(await roomView(viewer.profileId, viewer.nickname), {
    headers: NO_STORE,
  });
});
