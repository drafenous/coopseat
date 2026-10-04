import type { NextRequest } from 'next/server';
import { adminDb } from '@/prisma/db';
import { ApiError } from '../http';
import { rateLimit, type LIMITS } from '../rate-limit';
import { requireAuth } from '../session';
import { findOwner, loadViewer, type RoomOwner, type Viewer } from './access';

export const NO_STORE = { 'Cache-Control': 'no-store' };

/** Authenticated, rate-limited caller with their gates resolved. */
export async function partyCaller(req: NextRequest, bucket: keyof typeof LIMITS = 'party_admin') {
  const session = await requireAuth(req);
  await rateLimit(bucket, session.claims.sub);
  return { session, viewer: await loadViewer(session) };
}

export function requireVerified(viewer: Viewer): void {
  if (!viewer.permissions.watch.allowed) {
    throw new ApiError(403, 'party_requirements', { missing: viewer.permissions.watch.missing });
  }
}

export async function ownerOrThrow(nickname: string): Promise<RoomOwner> {
  const owner = await findOwner(nickname);
  if (!owner) throw new ApiError(404, 'party_not_found');
  return owner;
}

export async function profileByNickname(nickname: string) {
  const db = await adminDb();
  const profile = await db.orm.public.Profile.where({ nicknameKey: nickname.toLowerCase() }).first();
  if (!profile?.nickname) throw new ApiError(404, 'user_not_found');
  return profile;
}

export async function nicknames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const db = await adminDb();
  const rows = await db.orm.public.Profile.where((p) => p.id.in(ids)).all();
  return new Map(rows.map((r) => [r.id, r.nickname ?? '']));
}
