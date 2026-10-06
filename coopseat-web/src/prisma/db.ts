import { Pool } from 'pg';
import {
  supabase,
  type SupabaseOptionsWithContractJson,
} from '@prisma/orm-extension-supabase/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

/**
 * The Supabase session pooler allows 15 clients for the whole project. pg's default
 * pool takes 10 of those and keeps them for 30s, so a second server instance is over
 * the cap. One query holds a contract-marker connection and a role session together,
 * and the busiest page runs five queries at once, which needs six slots. Idle
 * connections are returned after a second.
 */
function createPool(url: string) {
  return new Pool({
    connectionString: url,
    max: 6,
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

const globalForDb = globalThis as unknown as { coopseatDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  globalForDb.coopseatDb ??= createDb();
  return globalForDb.coopseatDb;
}

export async function adminDb() {
  return (await getDb()).asServiceRole();
}
