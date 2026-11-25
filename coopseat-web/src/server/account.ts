import type { AccessClaims } from './jwt';
import type { AuthUser } from './gotrue';
import { ensureProfile } from './profiles';
import { permissionsFor } from '@/lib/gates';
import { activeSanctions } from './party/sanctions';
import { getPlatformPolicy } from './platform-policy';
import { securityCodesRemaining } from './security-codes';

/** Watch/host gates from an auth user and their profile. Shared with party admission. */
export function accountPermissions(
  user: AuthUser,
  claims: AccessClaims,
  profile: { nickname: string | null; ageStatus: string },
  opts?: { skipAgeVerification?: boolean },
) {
  const emailConfirmed = Boolean(user.email && user.email_confirmed_at);
  const mfaEnabled = (user.factors ?? []).some((f) => f.status === 'verified');
  return permissionsFor({
    emailConfirmed,
    nicknameSet: profile.nickname !== null,
    ageVerified:
      Boolean(opts?.skipAgeVerification) || profile.ageStatus === 'VERIFIED',
    mfaEnabled,
    aal: claims.aal ?? 'aal1',
  });
}

/** Public account shape returned by /api/me to the web and the desktop. */
export async function accountSummary(user: AuthUser, claims: AccessClaims) {
  const avatar =
    user.identities
      ?.map((i) => i.identity_data?.avatar_url ?? i.identity_data?.picture)
      .find((url): url is string => typeof url === 'string') ?? null;
  const [profile, sanctions, platform] = await Promise.all([
    ensureProfile(user.id, avatar),
    activeSanctions(user.id),
    getPlatformPolicy(),
  ]);
  const suspended = sanctions.has('platform');
  const verifiedFactors = (user.factors ?? []).filter(
    (f) => f.status === 'verified',
  );
  const emailConfirmed = Boolean(user.email && user.email_confirmed_at);
  const securityCodesLeft = verifiedFactors.length
    ? await securityCodesRemaining(user.id)
    : 0;

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
    suspended,
    identities: (user.identities ?? []).map((i) => ({
      id: i.identity_id ?? i.id,
      provider: i.provider,
      email: i.identity_data?.email ?? null,
    })),
    mfa: {
      enabled: verifiedFactors.length > 0,
      factors: verifiedFactors.map((f) => ({
        id: f.id,
        name: f.friendly_name ?? 'Autenticador',
      })),
      level: claims.aal ?? 'aal1',
      securityCodesRemaining: securityCodesLeft,
    },
    features: {
      ageVerificationDisabled: platform.ageVerificationDisabled,
      skipAgeVerification: platform.skipAgeVerification,
    },
    permissions: accountPermissions(user, claims, profile, {
      skipAgeVerification: platform.skipAgeVerification,
    }),
  };
}

export type AccountSummary = Awaited<ReturnType<typeof accountSummary>>;
