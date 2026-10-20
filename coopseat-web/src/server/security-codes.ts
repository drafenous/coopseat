import { randomBytes } from 'node:crypto';
import { adminDb } from '@/prisma/db';
import { hmacHex, safeEqual } from './crypto';
import { env } from './env';

/** Crockford-like alphabet: 32 symbols, so a byte maps without bias. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_COUNT = 10;

export function generateSecurityCode(): string {
  const bytes = randomBytes(8);
  let raw = '';
  for (const byte of bytes) raw += ALPHABET[byte % ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function generateSecurityCodes(count = CODE_COUNT): string[] {
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateSecurityCode());
  return [...codes];
}

/** Accepts `xxxx-xxxx`, spaces, or the raw 8 characters. */
export function normalizeSecurityCode(input: string): string | null {
  const raw = input.replace(/[\s-]/g, '').toUpperCase();
  if (!new RegExp(`^[${ALPHABET}]{8}$`).test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function hashSecurityCode(code: string): string {
  return hmacHex(env.ticketKey, `security-code:${code}`);
}

export async function securityCodesRemaining(
  profileId: string,
): Promise<number> {
  const db = await adminDb();
  const rows = await db.orm.public.SecurityCode.where({ profileId })
    .where((row) => row.usedAt.isNull())
    .all();
  return rows.length;
}

/** Replaces every code for the account. Returns the plaintext once. */
export async function replaceSecurityCodes(profileId: string): Promise<string[]> {
  const codes = generateSecurityCodes();
  const db = await adminDb();
  await db.orm.public.SecurityCode.where({ profileId }).deleteAll();
  for (const code of codes) {
    await db.orm.public.SecurityCode.create({
      profileId,
      codeHash: hashSecurityCode(code),
    });
  }
  return codes;
}

export async function deleteSecurityCodes(profileId: string): Promise<void> {
  const db = await adminDb();
  await db.orm.public.SecurityCode.where({ profileId }).deleteAll();
}

/**
 * Marks one unused code as used. Compares every remaining hash so a miss
 * does not reveal which position matched.
 */
export async function consumeSecurityCode(
  profileId: string,
  input: string,
): Promise<boolean> {
  const code = normalizeSecurityCode(input);
  if (!code) return false;
  const hash = hashSecurityCode(code);
  const db = await adminDb();
  const rows = await db.orm.public.SecurityCode.where({ profileId })
    .where((row) => row.usedAt.isNull())
    .all();
  let matchId: string | undefined;
  for (const row of rows) {
    if (safeEqual(row.codeHash, hash)) matchId = row.id;
  }
  if (!matchId) return false;
  await db.orm.public.SecurityCode.where({ id: matchId })
    .where((row) => row.usedAt.isNull())
    .updateAll({ usedAt: new Date().toISOString() });
  return true;
}
