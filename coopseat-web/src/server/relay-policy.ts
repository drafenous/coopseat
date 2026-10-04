import { adminDb } from '@/prisma/db';
import { env } from './env';
import { monthToDateEgressBytes } from './relay-usage';

export type RelayAudience = 'member' | 'guest';

export type RelayDenyReason =
  | 'disabled'
  | 'audience_disabled'
  | 'app_version_blocked'
  | 'user_blocked'
  | 'budget_exceeded'
  | 'budget_unverified'
  | 'quota_exceeded';

export type RelayPolicy = {
  enabled: boolean;
  membersEnabled: boolean;
  guestsEnabled: boolean;
  minAppVersion: string | null;
  blockedAppVersions: string | null;
  dailyCredentialQuota: number;
  credentialTtlSeconds: number;
  maxRelayBitrateKbps: number;
  monthlyBudgetGb: number | null;
};

export type RelayDecision = { allowed: true; policy: RelayPolicy } | { allowed: false; reason: RelayDenyReason; policy: RelayPolicy };

/** Used when the `relay_policy` row does not exist; mirrors the column defaults. */
export const DEFAULT_RELAY_POLICY: RelayPolicy = {
  enabled: true,
  membersEnabled: true,
  guestsEnabled: true,
  minAppVersion: null,
  blockedAppVersions: null,
  dailyCredentialQuota: 12,
  credentialTtlSeconds: 4 * 60 * 60,
  maxRelayBitrateKbps: 4000,
  monthlyBudgetGb: 900,
};

const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;
const BYTES_PER_GB = 1e9;

/**
 * Whether this month's TURN egress is still under budget. Unverifiable usage fails closed, except
 * outside production when analytics is simply not configured.
 */
async function checkBudget(policy: RelayPolicy): Promise<RelayDenyReason | null> {
  if (policy.monthlyBudgetGb === null) return null;
  const bytes = await monthToDateEgressBytes();
  if (bytes === null) {
    const configured = Boolean(env.cloudflareAccountId && env.cloudflareAnalyticsToken);
    if (!configured && !env.isProduction) return null;
    if (!configured) console.error('Relay budget set but CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_ANALYTICS_API_TOKEN missing');
    return 'budget_unverified';
  }
  return bytes >= policy.monthlyBudgetGb * BYTES_PER_GB ? 'budget_exceeded' : null;
}

/** Compares `major.minor.patch` (pre-release and build suffixes ignored). Returns <0, 0 or >0. */
export function compareSemver(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]!
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);
  const [pa, pb] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function isAppVersionBlocked(policy: RelayPolicy, appVersion: string | null): boolean {
  if (!appVersion) return false;
  if (policy.minAppVersion && compareSemver(appVersion, policy.minAppVersion) < 0) return true;
  const blocked = (policy.blockedAppVersions ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return blocked.some((v) => compareSemver(appVersion, v) === 0);
}

/**
 * Decides whether a user may get TURN credentials. Read on every request (no cache) so a
 * change made in the database takes effect immediately.
 */
export async function evaluateRelay(input: {
  audience: RelayAudience;
  profileId: string;
  appVersion: string | null;
}): Promise<RelayDecision> {
  const db = await adminDb();
  const row = await db.orm.public.RelayPolicy.where({ id: 'global' }).first();
  const policy: RelayPolicy = row
    ? {
        enabled: row.enabled,
        membersEnabled: row.membersEnabled,
        guestsEnabled: row.guestsEnabled,
        minAppVersion: row.minAppVersion,
        blockedAppVersions: row.blockedAppVersions,
        dailyCredentialQuota: row.dailyCredentialQuota,
        credentialTtlSeconds: row.credentialTtlSeconds,
        maxRelayBitrateKbps: row.maxRelayBitrateKbps,
        monthlyBudgetGb: row.monthlyBudgetGb,
      }
    : DEFAULT_RELAY_POLICY;
  const deny = (reason: RelayDenyReason): RelayDecision => ({ allowed: false, reason, policy });

  if (!policy.enabled) return deny('disabled');
  if (!(input.audience === 'member' ? policy.membersEnabled : policy.guestsEnabled)) return deny('audience_disabled');
  if (isAppVersionBlocked(policy, input.appVersion)) return deny('app_version_blocked');

  const override = await db.orm.public.RelayUserOverride.where({ profileId: input.profileId }).first();
  const overrideActive = override && (!override.expiresAt || Date.parse(override.expiresAt) > Date.now());
  if (overrideActive && override.blocked) return deny('user_blocked');

  const quota = (overrideActive ? override.dailyQuota : null) ?? policy.dailyCredentialQuota;
  const since = new Date(Date.now() - QUOTA_WINDOW_MS).toISOString();
  const { total } = await db.orm.public.RelayCredential.where((c) => c.profileId.eq(input.profileId))
    .where((c) => c.issuedAt.gte(since))
    .aggregate((a) => ({ total: a.count() }));
  if (total >= quota) return deny('quota_exceeded');

  const budget = await checkBudget(policy);
  if (budget) return deny(budget);

  return { allowed: true, policy };
}
