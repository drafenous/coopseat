import { adminDb } from '@/prisma/db';
import {
  decrypt,
  encrypt,
  pkceChallenge,
  randomToken,
  safeEqual,
  sha256Hex,
} from './crypto';

export type TicketKind = 'desktop_login' | 'link';

export type LinkPayload = {
  accessToken: string;
  provider: string;
  mode: 'link-web' | 'link-desktop';
};

const TTL_SECONDS = 60;

/** Creates a single-use ticket. Only its sha256 is stored; the payload is AES-GCM encrypted. */
export async function createTicket(
  kind: TicketKind,
  payload: unknown,
  challenge?: string,
): Promise<string> {
  const ticket = randomToken(32);
  const db = await adminDb();
  await db.orm.public.AuthTicket.create({
    id: sha256Hex(ticket),
    kind,
    challenge: challenge ?? null,
    payload: encrypt(JSON.stringify(payload)),
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
  });
  return ticket;
}

/**
 * Consumes a ticket (deleted on first read, valid or not). When the ticket was bound to a
 * PKCE challenge, the caller must present the matching verifier.
 */
export async function consumeTicket<T>(
  ticket: string,
  kind: TicketKind,
  verifier?: string,
): Promise<T | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null;
  const db = await adminDb();
  const deleted = await db.orm.public.AuthTicket.where({
    id: sha256Hex(ticket),
  }).deleteAll();
  const row = deleted[0];
  if (!row || row.kind !== kind) return null;
  if (Date.parse(row.expiresAt) < Date.now()) return null;
  if (row.challenge) {
    if (!verifier || !safeEqual(pkceChallenge(verifier), row.challenge))
      return null;
  }
  return JSON.parse(decrypt(row.payload)) as T;
}
