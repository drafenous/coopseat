#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/23bb5cfef55891ef734b30b3167ff59fbc9e4088bbe6961fb940709bf7fb7f08/contract';
import endContract from '../../snapshots/23bb5cfef55891ef734b30b3167ff59fbc9e4088bbe6961fb940709bf7fb7f08/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/28d6d8a8c18cfc32c238a819863fb285f0073e3f1e1c4f9a5d39f162bd9980d9/contract';
import startContract from '../../snapshots/28d6d8a8c18cfc32c238a819863fb285f0073e3f1e1c4f9a5d39f162bd9980d9/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
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
        table: 'relay_credentials',
        columns: [
          col('appVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('audience', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('issuedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('username', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('relay_credentials_audience_95bb5f2d', "audience IN ('member', 'guest')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'relay_policy',
        columns: [
          col('blockedAppVersions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('credentialTtlSeconds', 'int4', {
            notNull: true,
            default: lit(14400),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('dailyCredentialQuota', 'int4', {
            notNull: true,
            default: lit(12),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('guestsEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', {
            notNull: true,
            default: lit('global'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('maxRelayBitrateKbps', 'int4', {
            notNull: true,
            default: lit(4000),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('membersEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('minAppVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('relay_policy_quota_52d2783f', '"dailyCredentialQuota" >= 0'),
          checkExpression('relay_policy_singleton_3422eee5', "id = 'global'"),
          checkExpression(
            'relay_policy_ttl_d42b9ef6',
            '"credentialTtlSeconds" BETWEEN 60 AND 86400',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'relay_user_overrides',
        columns: [
          col('blocked', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dailyQuota', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['profileId'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'relay_credentials',
        index: 'relay_credentials_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'relay_credentials',
        index: 'relay_credentials_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'relay_credentials',
        index: 'relay_credentials_profileId_issuedAt_idx_04cadad5',
        columns: ['profileId', 'issuedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'relay_credentials',
        foreignKey: {
          name: 'relay_credentials_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'relay_user_overrides',
        foreignKey: {
          name: 'relay_user_overrides_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'relay_credentials' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'relay_policy' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'relay_user_overrides' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
