import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateRelay } from '@/server/relay-policy';
import { monthToDateEgressBytes, USAGE_MAX_STALE_MS, USAGE_REFRESH_MS } from '@/server/relay-usage';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({ adminDb: async () => fake.current.db, getDb: async () => fake.current.db }));

const GB = 1e9;
const input = { audience: 'member' as const, profileId: 'user-1', appVersion: null };
const analytics = (egressBytes: number) =>
  Response.json({
    data: { viewer: { accounts: [{ callsTurnUsageAdaptiveGroups: [{ sum: { egressBytes } }] }] } },
    errors: null,
  });
const month = () => new Date().toISOString().slice(0, 7);

describe('relay monthly budget', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fake.current = createFakeDb();
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'acct');
    vi.stubEnv('CLOUDFLARE_ANALYTICS_API_TOKEN', 'analytics-token');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchSpy = vi.fn(async () => analytics(10 * GB));
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('queries month-to-date TURN egress for the account and caches the reading', async () => {
    expect(await monthToDateEgressBytes()).toBe(10 * GB);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.cloudflare.com/client/v4/graphql');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer analytics-token');
    const { variables } = JSON.parse(init.body as string);
    expect(variables).toMatchObject({ accountTag: 'acct', from: `${month()}-01` });
    expect(fake.current.data.RelayUsage).toEqual([expect.objectContaining({ month: month(), egressBytes: 10 * GB })]);

    expect(await monthToDateEgressBytes()).toBe(10 * GB);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshes a reading older than the refresh interval', async () => {
    await fake.current.db.orm.public.RelayUsage.create({
      month: month(),
      egressBytes: 1,
      checkedAt: new Date(Date.now() - USAGE_REFRESH_MS - 1000).toISOString(),
    });
    expect(await monthToDateEgressBytes()).toBe(10 * GB);
    expect(fake.current.data.RelayUsage).toHaveLength(1);
    expect(fake.current.data.RelayUsage[0]!.egressBytes).toBe(10 * GB);
  });

  it('falls back to a recent reading when Cloudflare fails, and to null when it is too old', async () => {
    fetchSpy.mockImplementation(async () => new Response('down', { status: 503 }));
    await fake.current.db.orm.public.RelayUsage.create({
      month: month(),
      egressBytes: 5 * GB,
      checkedAt: new Date(Date.now() - USAGE_REFRESH_MS - 1000).toISOString(),
    });
    expect(await monthToDateEgressBytes()).toBe(5 * GB);

    fake.current.data.RelayUsage[0]!.checkedAt = new Date(Date.now() - USAGE_MAX_STALE_MS - 1000).toISOString();
    expect(await monthToDateEgressBytes()).toBeNull();
  });

  it('treats GraphQL errors as a failed reading', async () => {
    fetchSpy.mockImplementation(async () => Response.json({ data: null, errors: [{ message: 'not authorized' }] }));
    expect(await monthToDateEgressBytes()).toBeNull();
  });

  it('denies the relay once usage reaches the budget', async () => {
    await fake.current.db.orm.public.RelayPolicy.create({ monthlyBudgetGb: 10 });
    expect(await evaluateRelay(input)).toMatchObject({ allowed: false, reason: 'budget_exceeded' });

    fake.current.data.RelayPolicy[0]!.monthlyBudgetGb = 11;
    expect(await evaluateRelay(input)).toMatchObject({ allowed: true });
  });

  it('skips the budget when it is null', async () => {
    await fake.current.db.orm.public.RelayPolicy.create({ monthlyBudgetGb: null });
    expect(await evaluateRelay(input)).toMatchObject({ allowed: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails closed when usage cannot be verified', async () => {
    fetchSpy.mockImplementation(async () => new Response('down', { status: 503 }));
    expect(await evaluateRelay(input)).toMatchObject({ allowed: false, reason: 'budget_unverified' });
  });

  it('without analytics credentials, skips the budget in development but blocks in production', async () => {
    vi.stubEnv('CLOUDFLARE_ANALYTICS_API_TOKEN', '');
    expect(await evaluateRelay(input)).toMatchObject({ allowed: true });

    vi.stubEnv('NODE_ENV', 'production');
    expect(await evaluateRelay(input)).toMatchObject({ allowed: false, reason: 'budget_unverified' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
