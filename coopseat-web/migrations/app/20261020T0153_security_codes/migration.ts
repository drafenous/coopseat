#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4a5168d4a2cbf9a383b65d8bb6a664f12f8dd74348cec3b571d247b6975b56d1/contract';
import startContract from '../../snapshots/4a5168d4a2cbf9a383b65d8bb6a664f12f8dd74348cec3b571d247b6975b56d1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/801aea61a645f68a114948ec6d1482b5b02adb80acd24b20351f8b3017e08263/contract';
import endContract from '../../snapshots/801aea61a645f68a114948ec6d1482b5b02adb80acd24b20351f8b3017e08263/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'security_codes',
        columns: [
          col('codeHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('usedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'security_codes',
        constraint: 'security_codes_profileId_codeHash_key',
        columns: ['profileId', 'codeHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'security_codes',
        index: 'security_codes_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'security_codes',
        foreignKey: {
          name: 'security_codes_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'security_codes' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
