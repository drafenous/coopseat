import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from './env';

export type AccessClaims = {
  sub: string;
  email?: string;
  role: string;
  aal?: 'aal1' | 'aal2';
  session_id?: string;
  is_anonymous?: boolean;
  age_verified?: boolean;
  nickname_set?: boolean;
  exp: number;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  jwks ??= createRemoteJWKSet(new URL(env.jwksUrl));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.supabaseUrl}/auth/v1`,
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string' || payload['role'] !== 'authenticated') return null;
    return payload as unknown as AccessClaims;
  } catch {
    return null;
  }
}
