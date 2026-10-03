import { supabase } from '@prisma/orm-extension-supabase/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

function createDb() {
  return supabase<Contract>({
    contractJson,
    url: process.env['DATABASE_URL'],
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
