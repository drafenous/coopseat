import { config } from 'dotenv';
import { definePrismaConfig } from '@prisma/cli-engine';
import supabasePack from '@prisma/orm-extension-supabase/pack';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

config({ path: ['.env.local', '.env'], quiet: true });

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    extensions: [supabasePack],
    migrations: { dir: 'migrations' },
    db: {
      connection: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL']!,
    },
  }),
});
