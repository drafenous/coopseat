import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

const url = process.env.SQL_ADMIN_URL ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set SQL_ADMIN_URL (postgres role) or DIRECT_URL.');
  process.exit(1);
}

const dir = join(import.meta.dirname, '..', 'supabase', 'sql');
const files = (await readdir(dir))
  .filter((f) => f.endsWith('.sql') && !f.startsWith('000_'))
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  for (const file of files) {
    const sql = await readFile(join(dir, file), 'utf8');
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('commit');
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query('rollback');
      throw new Error(`${file}: ${err.message}`);
    }
  }
} finally {
  await client.end();
}
