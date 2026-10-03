import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env';

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function hmacHex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function key(): Buffer {
  const raw = Buffer.from(env.ticketKey, 'base64');
  if (raw.length !== 32) throw new Error('TICKET_ENCRYPTION_KEY precisa ter 32 bytes em base64.');
  return raw;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function decrypt(sealed: string): string {
  const raw = Buffer.from(sealed, 'base64url');
  const decipher = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

/** Stateless, encrypted and expiring token for short handoffs (MFA step, PKCE state). */
export function seal(data: unknown, ttlSeconds: number): string {
  return encrypt(JSON.stringify({ d: data, e: Date.now() + ttlSeconds * 1000 }));
}

export function unseal<T>(token: string): T | null {
  try {
    const { d, e } = JSON.parse(decrypt(token)) as { d: T; e: number };
    return Date.now() < e ? d : null;
  } catch {
    return null;
  }
}
