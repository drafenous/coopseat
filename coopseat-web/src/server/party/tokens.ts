import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose';
import {
  ROOM_TOKEN_AUDIENCE,
  ROOM_TOKEN_ISSUER,
  ROOM_TOKEN_TTL_SECONDS,
  type RoomTokenClaims,
} from '@coopseat/ui/party-protocol';
import { env } from '../env';

const ALG = 'EdDSA';
let privateKey: Promise<CryptoKey> | undefined;
let publicKey: Promise<CryptoKey> | undefined;

export type RoomTokenInput = Omit<RoomTokenClaims, 'exp' | 'iat'>;

/** Short-lived Ed25519 JWT the signal server verifies offline with the public key. */
export async function signRoomToken(
  claims: RoomTokenInput,
): Promise<{ token: string; expiresAt: number }> {
  privateKey ??= importPKCS8(env.partyTokenPrivateKey, ALG);
  const expiresAt = Math.floor(Date.now() / 1000) + ROOM_TOKEN_TTL_SECONDS;
  const { sub, ...rest } = claims;
  const token = await new SignJWT(rest)
    .setProtectedHeader({ alg: ALG, typ: 'JWT' })
    .setIssuer(ROOM_TOKEN_ISSUER)
    .setAudience(ROOM_TOKEN_AUDIENCE)
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(await privateKey);
  return { token, expiresAt };
}

export async function verifyRoomToken(
  token: string,
): Promise<RoomTokenClaims | null> {
  publicKey ??= importSPKI(env.partyTokenPublicKey, ALG);
  try {
    const { payload } = await jwtVerify(token, await publicKey, {
      issuer: ROOM_TOKEN_ISSUER,
      audience: ROOM_TOKEN_AUDIENCE,
      algorithms: [ALG],
    });
    if (typeof payload.sub !== 'string' || typeof payload['sid'] !== 'string')
      return null;
    return payload as unknown as RoomTokenClaims;
  } catch {
    return null;
  }
}
