import { adminDb } from '@/prisma/db';

export type PlatformPolicy = {
  ageVerificationDisabled: boolean;
  skipAgeVerification: boolean;
};

/** Used when the `platform_policy` row does not exist; mirrors the column defaults. */
export const DEFAULT_PLATFORM_POLICY: PlatformPolicy = {
  ageVerificationDisabled: false,
  skipAgeVerification: false,
};

/** Read on every call (no cache) so operators' SQL changes apply immediately. */
export async function getPlatformPolicy(): Promise<PlatformPolicy> {
  const db = await adminDb();
  const row = await db.orm.public.PlatformPolicy.where({ id: 'global' }).first();
  if (!row) return DEFAULT_PLATFORM_POLICY;
  return {
    ageVerificationDisabled: row.ageVerificationDisabled,
    skipAgeVerification: row.skipAgeVerification,
  };
}
