#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/801aea61a645f68a114948ec6d1482b5b02adb80acd24b20351f8b3017e08263/contract';
import startContract from '../../snapshots/801aea61a645f68a114948ec6d1482b5b02adb80acd24b20351f8b3017e08263/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ac614c0f6d849d988afc6be1224f3b5b5f52e92d8a914cb0ce14681843458df2/contract';
import endContract from '../../snapshots/ac614c0f6d849d988afc6be1224f3b5b5f52e92d8a914cb0ce14681843458df2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'party_rooms',
        column: col('listed', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
