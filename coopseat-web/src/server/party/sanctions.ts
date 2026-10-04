import { adminDb } from '@/prisma/db';
import { ApiError } from '../http';

export const SANCTION_SCOPES = ['platform', 'party_host', 'party_stream', 'party_join', 'party_chat'] as const;
export type SanctionScope = (typeof SANCTION_SCOPES)[number];

/** Scopes of the sanctions in force (not revoked, not expired). `platform` implies every other scope. */
export async function activeSanctions(profileId: string): Promise<Set<SanctionScope>> {
  const db = await adminDb();
  const rows = await db.orm.public.PlatformSanction.where({ profileId }).all();
  const now = Date.now();
  return new Set(
    rows
      .filter((r) => !r.revokedAt && (!r.expiresAt || Date.parse(r.expiresAt) > now))
      .map((r) => r.scope as SanctionScope),
  );
}

export function isBlocked(scopes: Set<SanctionScope>, scope: SanctionScope): boolean {
  return scopes.has('platform') || scopes.has(scope);
}

export async function assertNotSuspended(profileId: string): Promise<void> {
  if ((await activeSanctions(profileId)).has('platform')) throw new ApiError(403, 'account_suspended');
}
