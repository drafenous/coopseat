import { Pool } from 'pg';
import {
  supabase,
  type SupabaseOptionsWithContractJson,
} from '@prisma/orm-extension-supabase/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import { isAuthDb } from './request-db';

/**
 * The role session stays checked out while the runtime reads the contract
 * marker on a second connection. Parallel queries then fill the pool and the
 * marker read waits until the 20s connect timeout. Marker drift is checked by
 * `prisma db migrate` in CI, so requests skip that read and hold one connection
 * each. The application pool serves party (up to five queries). Login, /api/me
 * and the account page use the auth pool, so a live room does not block them.
 * Idle connections are returned after a second.
 */
const APP_POOL_MAX = 6;
const AUTH_POOL_MAX = 3;

const pools: { app?: Pool; auth?: Pool } = {};

function createPool(url: string, max: number) {
  return new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 1_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
  });
}

function createDb(max: number, slot: 'app' | 'auth') {
  const url = process.env['DATABASE_URL'];
  const pool = url ? createPool(url, max) : undefined;
  if (pool) pools[slot] = pool;
  return supabase<Contract>({
    contractJson,
    verifyMarker: false,
    ...(pool
      ? {
          // The app and Prisma resolve different copies of @types/pg.
          pg: pool as NonNullable<
            SupabaseOptionsWithContractJson<Contract>['pg']
          >,
        }
      : { url }),
    jwksUrl:
      process.env['SUPABASE_JWKS_URL'] ??
      `${process.env['SUPABASE_URL']}/auth/v1/.well-known/jwks.json`,
  });
}

type Db = Awaited<ReturnType<typeof createDb>>;

const globalForDb = globalThis as unknown as {
  coopseatDb?: Promise<Db>;
  coopseatAuthDb?: Promise<Db>;
};

export function getDb(): Promise<Db> {
  globalForDb.coopseatDb ??= createDb(APP_POOL_MAX, 'app');
  return globalForDb.coopseatDb;
}

function getAuthDb(): Promise<Db> {
  globalForDb.coopseatAuthDb ??= createDb(AUTH_POOL_MAX, 'auth');
  return globalForDb.coopseatAuthDb;
}

export type RateLock = 'ok' | 'limited' | 'unsupported';

/**
 * Counts and inserts one hit while holding a transaction lock on the key.
 * Without DATABASE_URL there is no pool; callers keep the serial ORM path.
 */
export async function tryLockedRateLimit(
  key: string,
  max: number,
  since: string,
): Promise<RateLock> {
  if (!process.env['DATABASE_URL']) return 'unsupported';
  await (isAuthDb() ? getAuthDb() : getDb());
  const pool = isAuthDb() ? pools.auth : pools.app;
  if (!pool) return 'unsupported';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // The pool is shared with the ORM, which sets a role per request.
    // Back to the login role (prisma), which bypasses row security.
    await client.query('RESET ROLE');
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))',
      [key],
    );
    const counted = await client.query<{ total: number }>(
      `SELECT count(*)::int AS total
         FROM public.rate_limit_hits
        WHERE key = $1 AND "createdAt" >= $2::timestamptz`,
      [key, since],
    );
    const total = Number(counted.rows[0]?.total ?? 0);
    if (total >= max) {
      await client.query('COMMIT');
      return 'limited';
    }
    await client.query(
      'INSERT INTO public.rate_limit_hits (id, key) VALUES (gen_random_uuid(), $1)',
      [key],
    );
    await client.query('COMMIT');
    return 'ok';
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* the connection already failed */
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function adminDb() {
  const db = await (isAuthDb() ? getAuthDb() : getDb());
  return db.asServiceRole();
}
