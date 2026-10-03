import { config } from 'dotenv';
config({ path: ['.env.local', '.env'], quiet: true });
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

// Runs supabase/tests/*.sql against a dev/staging database. Every file runs in a
// transaction that is always rolled back, so no test data is left behind.
const url = process.env.SQL_ADMIN_URL;
if (!url) {
  console.error('Set SQL_ADMIN_URL (postgres role of a NON-production project).');
  process.exit(1);
}

const dir = join(import.meta.dirname, '..', 'supabase', 'tests');
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
const client = new pg.Client({ connectionString: url });
client.on('notice', (msg) => console.log(`  ${msg.message}`));
await client.connect();
let failed = 0;
try {
  for (const file of files) {
    await client.query('begin');
    try {
      await client.query(await readFile(join(dir, file), 'utf8'));
      console.log(`ok   ${file}`);
    } catch (err) {
      failed++;
      console.error(`FAIL ${file}: ${err.message}`);
    } finally {
      await client.query('rollback');
    }
  }
} finally {
  await client.end();
}
process.exit(failed ? 1 : 0);
