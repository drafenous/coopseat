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

function createPool(url: string, max: number) {
  return new Pool({
    connectionString: url,
    max,
    idleTimeoutMillis: 1_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
  });
}

function createDb(max: number) {
  const url = process.env['DATABASE_URL'];
  return supabase<Contract>({
    contractJson,
    verifyMarker: false,
    ...(url
      ? {
          // The app and Prisma resolve different copies of @types/pg.
          pg: createPool(url, max) as NonNullable<
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
  globalForDb.coopseatDb ??= createDb(APP_POOL_MAX);
  return globalForDb.coopseatDb;
}

function getAuthDb(): Promise<Db> {
  globalForDb.coopseatAuthDb ??= createDb(AUTH_POOL_MAX);
  return globalForDb.coopseatAuthDb;
}

export async function adminDb() {
  const db = await (isAuthDb() ? getAuthDb() : getDb());
  return db.asServiceRole();
}
