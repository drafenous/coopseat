import { adminDb } from '@/prisma/db';
import { isReservedNickname } from '@/lib/validation/account';
import { ApiError } from './http';

export const NICKNAME_COOLDOWN_DAYS = 30;

export function isUniqueViolation(err: unknown, depth = 0): boolean {
  if (!err || typeof err !== 'object' || depth > 5) return false;
  const e = err as { code?: unknown; sqlState?: unknown; meta?: { sqlState?: unknown }; cause?: unknown };
  if (e.code === '23505' || e.sqlState === '23505' || e.meta?.sqlState === '23505') return true;
  return isUniqueViolation(e.cause, depth + 1);
}

export async function getProfile(id: string) {
  const db = await adminDb();
  return db.orm.public.Profile.where({ id }).first();
}

/** The auth.users trigger creates profiles; this covers users created before it existed. */
export async function ensureProfile(id: string, avatarUrl?: string | null) {
  const existing = await getProfile(id);
  if (existing) return existing;
  const db = await adminDb();
  try {
    return await db.orm.public.Profile.create({ id, avatarUrl: avatarUrl ?? null });
  } catch (err) {
    if (isUniqueViolation(err)) return (await getProfile(id))!;
    throw err;
  }
}

export async function isNicknameAvailable(nickname: string, exceptProfileId?: string): Promise<boolean> {
  if (isReservedNickname(nickname)) return false;
  const db = await adminDb();
  const row = await db.orm.public.Profile.where({ nicknameKey: nickname.toLowerCase() }).select('id').first();
  return !row || row.id === exceptProfileId;
}

export async function setNickname(profileId: string, nickname: string, opts: { enforceCooldown: boolean }) {
  const profile = await ensureProfile(profileId);
  if (profile.nickname === nickname) return profile;

  if (opts.enforceCooldown && profile.nickname && profile.nicknameChangedAt) {
    const nextChange = Date.parse(profile.nicknameChangedAt) + NICKNAME_COOLDOWN_DAYS * 86_400_000;
    if (Date.now() < nextChange) {
      throw new ApiError(429, 'nickname_cooldown', 'Você só pode trocar de apelido uma vez a cada 30 dias.', {
        nextChangeAt: new Date(nextChange).toISOString(),
      });
    }
  }
  if (!(await isNicknameAvailable(nickname, profileId))) {
    throw new ApiError(409, 'nickname_taken', 'Esse apelido já está em uso.');
  }

  const db = await adminDb();
  try {
    const [updated] = await db.orm.public.Profile.where({ id: profileId }).updateAll({
      nickname,
      nicknameKey: nickname.toLowerCase(),
      nicknameChangedAt: new Date().toISOString(),
    });
    return updated!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ApiError(409, 'nickname_taken', 'Esse apelido já está em uso.');
    throw err;
  }
}

export async function acceptTerms(profileId: string, version: string) {
  const db = await adminDb();
  await db.orm.public.Profile.where({ id: profileId }).updateAll({
    termsVersion: version,
    termsAcceptedAt: new Date().toISOString(),
  });
}
