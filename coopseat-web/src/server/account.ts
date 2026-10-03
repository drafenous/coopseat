import type { AccessClaims } from './jwt';
import type { AuthUser } from './gotrue';
import { ensureProfile } from './profiles';
import { permissionsFor } from '@/lib/gates';

/** Public account shape returned by /api/me to the web and the desktop. */
export async function accountSummary(user: AuthUser, claims: AccessClaims) {
  const avatar =
    user.identities
      ?.map((i) => i.identity_data?.avatar_url ?? i.identity_data?.picture)
      .find((url): url is string => typeof url === 'string') ?? null;
  const profile = await ensureProfile(user.id, avatar);
  const verifiedFactors = (user.factors ?? []).filter((f) => f.status === 'verified');
  const emailConfirmed = Boolean(user.email && user.email_confirmed_at);

  return {
    id: user.id,
    email: user.email ?? null,
    pendingEmail: user.new_email ?? null,
    emailConfirmed,
    needsEmail: !user.email,
    nickname: profile.nickname,
    nicknameChangedAt: profile.nicknameChangedAt,
    avatarUrl: profile.avatarUrl,
    ageStatus: profile.ageStatus,
    ageVerifiedAt: profile.ageVerifiedAt,
    termsVersion: profile.termsVersion,
    identities: (user.identities ?? []).map((i) => ({
      id: i.identity_id ?? i.id,
      provider: i.provider,
      email: i.identity_data?.email ?? null,
    })),
    mfa: {
      enabled: verifiedFactors.length > 0,
      factors: verifiedFactors.map((f) => ({ id: f.id, name: f.friendly_name ?? 'Autenticador' })),
      level: claims.aal ?? 'aal1',
    },
    permissions: permissionsFor({
      emailConfirmed,
      nicknameSet: profile.nickname !== null,
      ageVerified: profile.ageStatus === 'VERIFIED',
      mfaEnabled: verifiedFactors.length > 0,
      aal: claims.aal ?? 'aal1',
    }),
  };
}

export type AccountSummary = Awaited<ReturnType<typeof accountSummary>>;
