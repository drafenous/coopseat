import { Pool } from 'pg';
import {
  supabase,
  type SupabaseOptionsWithContractJson,
} from '@prisma/orm-extension-supabase/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };
import { useAuthDb } from './request-db';

/**
 * One in-flight query holds the contract-marker connection and the service-role
 * session together, so each pool keeps two slots. The application pool serves
 * party and the rest of the site. Login and /api/me use a second pool, so a
 * live room cannot fill the queue those routes wait on. Idle connections are
 * returned after a second. At peak one instance holds four session-pooler clients.
 */
function createPool(url: string) {
  return new Pool({
    connectionString: url,
    max: 2,
    idleTimeoutMillis: 1_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
  });
}

function createDb() {
  const url = process.env['DATABASE_URL'];
  return supabase<Contract>({
    contractJson,
    ...(url
      ? {
          // The app and Prisma resolve different copies of @types/pg.
          pg: createPool(url) as NonNullable<
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
  globalForDb.coopseatDb ??= createDb();
  return globalForDb.coopseatDb;
}

function getAuthDb(): Promise<Db> {
  globalForDb.coopseatAuthDb ??= createDb();
  return globalForDb.coopseatAuthDb;
}

export async function adminDb() {
  const db = await (useAuthDb() ? getAuthDb() : getDb());
  return db.asServiceRole();
}
