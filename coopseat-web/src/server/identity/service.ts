import { adminDb } from '@/prisma/db';
import { hmacHex } from '../crypto';
import { env } from '../env';
import { ApiError } from '../http';
import { ensureProfile, isUniqueViolation } from '../profiles';
import { activeProvider } from './index';
import type { VerificationResult } from './types';

export const MAX_ATTEMPTS_30_DAYS = 3;
export const MAX_REJECTIONS_TOTAL = 5;

export function documentFingerprint(country: string, number: string): string {
  const normalized = `${country.trim().toUpperCase()}:${number.replace(/[^0-9A-Za-z]/g, '').toUpperCase()}`;
  return hmacHex(env.docFingerprintSecret, normalized);
}

export async function startVerification(profileId: string, returnUrl: string) {
  const profile = await ensureProfile(profileId);
  if (profile.ageStatus === 'VERIFIED') {
    throw new ApiError(409, 'already_verified');
  }

  const db = await adminDb();
  const verifications = db.orm.public.IdentityVerification;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { recent } = await verifications
    .where((v) => v.profileId.eq(profileId))
    .where((v) => v.createdAt.gte(since))
    .aggregate((a) => ({ recent: a.count() }));
  const { rejected } = await verifications
    .where((v) => v.profileId.eq(profileId))
    .where((v) => v.status.eq('rejected'))
    .aggregate((a) => ({ rejected: a.count() }));

  if (rejected >= MAX_REJECTIONS_TOTAL) {
    throw new ApiError(403, 'kyc_locked');
  }
  if (recent >= MAX_ATTEMPTS_30_DAYS) {
    throw new ApiError(429, 'kyc_attempts');
  }

  const provider = activeProvider();
  const session = await provider.createSession({
    profileId,
    returnUrl,
    callbackUrl: `${env.appUrl}/api/identity/webhooks/${provider.id}`,
  });

  await verifications.create({
    profileId,
    provider: provider.id,
    providerSessionId: session.sessionId,
  });
  await db.orm.public.Profile.where({ id: profileId }).updateAll({ ageStatus: 'PENDING' });
  return session;
}

/** Applies a provider result. Idempotent: completed verifications are not touched again. */
export async function applyVerificationResult(providerId: string, result: VerificationResult) {
  const db = await adminDb();
  const verifications = db.orm.public.IdentityVerification;
  const row = await verifications
    .where({ providerSessionId: result.sessionId })
    .first();
  if (!row || row.provider !== providerId) return { applied: false, reason: 'unknown_session' as const };
  if (row.completedAt) return { applied: false, reason: 'already_completed' as const };

  const now = new Date().toISOString();
  const profiles = db.orm.public.Profile.where({ id: row.profileId });

  if (result.status === 'review') {
    await verifications.where({ id: row.id }).updateAll({ status: 'review' });
    return { applied: true, status: 'review' as const };
  }

  const approvedAdult = result.status === 'approved' && result.isAdult === true && result.document !== null;
  if (!approvedAdult) {
    const reason =
      result.status === 'approved' && result.isAdult === false ? 'underage' : (result.failureReason ?? 'rejected');
    await verifications.where({ id: row.id }).updateAll({
      status: 'rejected',
      isAdult: result.isAdult,
      failureReason: reason.slice(0, 200),
      completedAt: now,
    });
    await profiles.updateAll({ ageStatus: 'REJECTED' });
    return { applied: true, status: 'rejected' as const };
  }

  try {
    await verifications.where({ id: row.id }).updateAll({
      status: 'approved',
      isAdult: true,
      documentFingerprint: documentFingerprint(result.document!.country, result.document!.number),
      completedAt: now,
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    await verifications.where({ id: row.id }).updateAll({
      status: 'rejected',
      isAdult: true,
      failureReason: 'document_already_used',
      completedAt: now,
    });
    await profiles.updateAll({ ageStatus: 'REJECTED' });
    return { applied: true, status: 'rejected' as const };
  }

  await profiles.updateAll({ ageStatus: 'VERIFIED', ageVerifiedAt: now });
  return { applied: true, status: 'approved' as const };
}
