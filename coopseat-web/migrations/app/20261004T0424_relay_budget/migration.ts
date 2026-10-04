#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/23bb5cfef55891ef734b30b3167ff59fbc9e4088bbe6961fb940709bf7fb7f08/contract';
import startContract from '../../snapshots/23bb5cfef55891ef734b30b3167ff59fbc9e4088bbe6961fb940709bf7fb7f08/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/2ce8ed99f683ffe3565107d651e1d87d3a75403c3f72fe66d0a0d8618fa75358/contract';
import endContract from '../../snapshots/2ce8ed99f683ffe3565107d651e1d87d3a75403c3f72fe66d0a0d8618fa75358/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'relay_usage',
        columns: [
          col('checkedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('egressBytes', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8number@1' } }),
          col('month', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['month']),
          checkExpression('relay_usage_month_1c19c2a5', "month ~ '^[0-9]{4}-[0-9]{2}$'"),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'relay_policy',
        column: col('monthlyBudgetGb', 'int4', {
          default: lit(900),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'relay_usage' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
