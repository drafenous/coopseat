#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4a5168d4a2cbf9a383b65d8bb6a664f12f8dd74348cec3b571d247b6975b56d1/contract';
import endContract from '../../snapshots/4a5168d4a2cbf9a383b65d8bb6a664f12f8dd74348cec3b571d247b6975b56d1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/93351f27250979fd78d49d798247e5b3a7ffa9eefc04bcc38458b2bc82ca21db/contract';
import startContract from '../../snapshots/93351f27250979fd78d49d798247e5b3a7ffa9eefc04bcc38458b2bc82ca21db/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'party_rooms',
        constraint: 'party_rooms_layout_8a3d9b9f',
      }),
      rawSql({
        id: 'data.party_rooms.backfill-layout-stage-grid',
        label: 'Map legacy split/focus defaultLayout values to stage',
        operationClass: 'data',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'party_rooms',
            table: 'party_rooms',
          },
        },
        precheck: [],
        execute: [
          {
            description: 'set defaultLayout=stage where split or focus',
            sql: `UPDATE "public"."party_rooms" SET "defaultLayout" = 'stage' WHERE "defaultLayout" IN ('split', 'focus')`,
          },
        ],
        postcheck: [
          {
            description: 'verify no split/focus layouts remain',
            sql: `SELECT NOT EXISTS (SELECT 1 AS "one" FROM "public"."party_rooms" WHERE "defaultLayout" IN ('split', 'focus') LIMIT 1) AS "result"`,
          },
        ],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'party_rooms',
        constraint: 'party_rooms_layout_6afdcbc3',
        expression: "\"defaultLayout\" IN ('stage', 'grid')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
