import { adminDb } from '@/prisma/db';

export type PartyPolicy = {
  enabled: boolean;
  maxParticipants: number;
  maxStreamers: number;
  sessionMaxHours: number;
  ownerGraceSeconds: number;
  chatEnabled: boolean;
};

/** Hard ceiling regardless of the policy row: mesh P2P can't carry more senders per room. */
export const STREAMER_CAP = 10;

/** Used when the `party_policy` row does not exist; mirrors the column defaults. */
export const DEFAULT_PARTY_POLICY: PartyPolicy = {
  enabled: true,
  maxParticipants: 10,
  maxStreamers: 10,
  sessionMaxHours: 12,
  ownerGraceSeconds: 60,
  chatEnabled: true,
};

/** Read on every call (no cache) so operators' SQL changes apply immediately. */
export async function getPartyPolicy(): Promise<PartyPolicy> {
  const db = await adminDb();
  const row = await db.orm.public.PartyPolicy.where({ id: 'global' }).first();
  if (!row) return DEFAULT_PARTY_POLICY;
  return {
    enabled: row.enabled,
    maxParticipants: row.maxParticipants,
    maxStreamers: Math.min(row.maxStreamers, STREAMER_CAP),
    sessionMaxHours: row.sessionMaxHours,
    ownerGraceSeconds: row.ownerGraceSeconds,
    chatEnabled: row.chatEnabled,
  };
}

export function roomCapacity(policy: PartyPolicy, room: { maxParticipants: number | null } | null): number {
  return room?.maxParticipants ?? policy.maxParticipants;
}
