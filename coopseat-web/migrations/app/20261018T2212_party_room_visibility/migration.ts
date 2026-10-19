#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4a3af9354269f6a831ce48b36c1970ffa80fd99930f25c981323001749df2360/contract';
import startContract from '../../snapshots/4a3af9354269f6a831ce48b36c1970ffa80fd99930f25c981323001749df2360/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/93351f27250979fd78d49d798247e5b3a7ffa9eefc04bcc38458b2bc82ca21db/contract';
import endContract from '../../snapshots/93351f27250979fd78d49d798247e5b3a7ffa9eefc04bcc38458b2bc82ca21db/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'party_rooms',
        constraint: 'party_rooms_protected_79f84d77',
      }),
      this.setDefault({
        schema: 'public',
        table: 'party_rooms',
        column: 'whitelistEnabled',
        defaultSql: 'DEFAULT true',
        operationClass: 'widening',
      }),
      // Approval-only rooms become Protected (allow-list bypass on).
      rawSql({
        id: 'data.party_rooms.backfill-protected-whitelist',
        label:
          'Backfill party_rooms.whitelistEnabled for approval-only rooms',
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
            description:
              'set whitelistEnabled=true on approval-only party_rooms',
            sql: 'UPDATE "public"."party_rooms" SET "whitelistEnabled" = true WHERE "requireApproval" = true AND "whitelistEnabled" = false',
          },
        ],
        postcheck: [
          {
            description:
              'verify no approval-only rooms remain with whitelistEnabled=false',
            sql: 'SELECT NOT EXISTS (SELECT 1 AS "one" FROM "public"."party_rooms" WHERE "requireApproval" = true AND "whitelistEnabled" = false LIMIT 1) AS "result"',
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
