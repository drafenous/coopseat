#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4ceeb2c25f9ffd0c80c70b95d3b0d75279132c8aa788828fca2e2b606570a067/contract';
import endContract from '../../snapshots/4ceeb2c25f9ffd0c80c70b95d3b0d75279132c8aa788828fca2e2b606570a067/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ac614c0f6d849d988afc6be1224f3b5b5f52e92d8a914cb0ce14681843458df2/contract';
import startContract from '../../snapshots/ac614c0f6d849d988afc6be1224f3b5b5f52e92d8a914cb0ce14681843458df2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'platform_policy',
        columns: [
          col('ageVerificationDisabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', {
            notNull: true,
            default: lit('global'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('skipAgeVerification', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('platform_policy_singleton_3422eee5', "id = 'global'"),
        ],
      }),
      // Seed Didit-off defaults so age gates and KYC UI are off after migrate.
      rawSql({
        id: 'data.platform_policy.seed-didit-off',
        label: 'Seed platform_policy global with age verification disabled',
        operationClass: 'data',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'table',
            name: 'platform_policy',
            table: 'platform_policy',
          },
        },
        precheck: [],
        execute: [
          {
            description:
              'insert global platform_policy with ageVerificationDisabled and skipAgeVerification true',
            sql: `INSERT INTO "public"."platform_policy" ("id", "ageVerificationDisabled", "skipAgeVerification", "updatedAt")
VALUES ('global', true, true, now())
ON CONFLICT ("id") DO UPDATE SET
  "ageVerificationDisabled" = EXCLUDED."ageVerificationDisabled",
  "skipAgeVerification" = EXCLUDED."skipAgeVerification",
  "updatedAt" = now()`,
          },
        ],
        postcheck: [
          {
            description:
              'verify global platform_policy has both age flags enabled',
            sql: `SELECT EXISTS (
  SELECT 1 FROM "public"."platform_policy"
  WHERE "id" = 'global'
    AND "ageVerificationDisabled" = true
    AND "skipAgeVerification" = true
  LIMIT 1
) AS "result"`,
          },
        ],
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'platform_policy' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
