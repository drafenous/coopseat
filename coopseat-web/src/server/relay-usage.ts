import { adminDb } from '@/prisma/db';
import { env } from './env';

/** How long a usage reading is reused before asking Cloudflare again. */
export const USAGE_REFRESH_MS = 5 * 60 * 1000;
/** A reading older than this is not trusted when Cloudflare cannot be reached. */
export const USAGE_MAX_STALE_MS = 60 * 60 * 1000;

const QUERY = `query TurnEgress($accountTag: string!, $from: Date!, $to: Date!) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      callsTurnUsageAdaptiveGroups(limit: 1, filter: { date_geq: $from, date_leq: $to }) {
        sum { egressBytes }
      }
    }
  }
}`;

type GraphQlResponse = {
  data?: { viewer?: { accounts?: { callsTurnUsageAdaptiveGroups?: { sum?: { egressBytes?: number } }[] }[] } };
  errors?: { message: string }[] | null;
};

/** Account-wide TURN egress from the first day of the current UTC month until today. */
async function fetchMonthToDateEgress(now: Date): Promise<number> {
  const to = now.toISOString().slice(0, 10);
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.cloudflareAnalyticsToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { accountTag: env.cloudflareAccountId, from: `${to.slice(0, 7)}-01`, to },
    }),
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as GraphQlResponse;
  if (!res.ok || body.errors?.length || !body.data?.viewer?.accounts) {
    throw new Error(`Cloudflare analytics ${res.status}: ${body.errors?.[0]?.message ?? 'no data'}`);
  }
  const groups = body.data.viewer.accounts[0]?.callsTurnUsageAdaptiveGroups ?? [];
  return groups.reduce((total, g) => total + (g.sum?.egressBytes ?? 0), 0);
}

/**
 * TURN egress this month in bytes, cached in `relay_usage` for USAGE_REFRESH_MS so serverless
 * instances share one reading. Null when usage can't be verified: analytics not configured,
 * or Cloudflare unreachable with no reading newer than USAGE_MAX_STALE_MS.
 */
export async function monthToDateEgressBytes(now = new Date()): Promise<number | null> {
  if (!env.cloudflareAccountId || !env.cloudflareAnalyticsToken) return null;
  const month = now.toISOString().slice(0, 7);
  const db = await adminDb();
  const usage = db.orm.public.RelayUsage;
  const cached = await usage.where({ month }).first();
  const age = cached ? now.getTime() - Date.parse(cached.checkedAt) : Infinity;
  if (cached && age < USAGE_REFRESH_MS) return cached.egressBytes;

  try {
    const egressBytes = await fetchMonthToDateEgress(now);
    const row = { egressBytes, checkedAt: now.toISOString() };
    const updated = await usage.where({ month }).updateAll(row);
    if (updated.length === 0) {
      await usage.create({ month, ...row }).catch((err: { code?: string }) => {
        if (err.code !== '23505') throw err;
      });
    }
    return egressBytes;
  } catch (err) {
    console.error('TURN usage check failed', err);
    return cached && age < USAGE_MAX_STALE_MS ? cached.egressBytes : null;
  }
}
