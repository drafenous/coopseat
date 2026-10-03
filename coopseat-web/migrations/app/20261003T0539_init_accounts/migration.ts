#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/28d6d8a8c18cfc32c238a819863fb285f0073e3f1e1c4f9a5d39f162bd9980d9/contract';
import endContract from '../../snapshots/28d6d8a8c18cfc32c238a819863fb285f0073e3f1e1c4f9a5d39f162bd9980d9/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'auth_tickets',
        columns: [
          col('challenge', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'auth_tickets_kind_check_49651328',
            "\"kind\" IN ('desktop_login', 'link')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'identity_verifications',
        columns: [
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentFingerprint', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('failureReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isAdult', 'bool', { codecRef: { codecId: 'pg/bool@1' } }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('provider', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('providerSessionId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('created'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'identity_verifications_status_check_43b000f7',
            "\"status\" IN ('created', 'approved', 'rejected', 'review')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'profiles',
        columns: [
          col('ageStatus', 'text', {
            notNull: true,
            default: lit('UNVERIFIED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ageVerifiedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('nickname', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('nicknameChangedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('nicknameKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('termsAcceptedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('termsVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'profiles_ageStatus_check_a5aaea88',
            "\"ageStatus\" IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED')",
          ),
          checkExpression(
            'profiles_nickname_format_f9d1d8b1',
            "nickname IS NULL OR nickname ~ '^[A-Za-z0-9_]{3,20}$'",
          ),
          checkExpression(
            'profiles_nickname_key_99a12a76',
            '"nicknameKey" IS NOT DISTINCT FROM lower(nickname)',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'rate_limit_hits',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'identity_verifications',
        constraint: 'identity_verifications_providerSessionId_key',
        columns: ['providerSessionId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'profiles',
        constraint: 'profiles_nicknameKey_key',
        columns: ['nicknameKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auth_tickets',
        index: 'auth_tickets_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'identity_verifications',
        index: 'identity_verifications_fingerprint_approved_4ee76cca',
        columns: ['documentFingerprint'],
        extras: { where: "status = 'approved'", unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'identity_verifications',
        index: 'identity_verifications_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'rate_limit_hits',
        index: 'rate_limit_hits_key_createdAt_idx_82c8d55f',
        columns: ['key', 'createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'identity_verifications',
        foreignKey: {
          name: 'identity_verifications_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'profiles',
        foreignKey: {
          name: 'profiles_id_fkey',
          columns: ['id'],
          references: { schema: 'auth', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'auth_tickets' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'identity_verifications' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'profiles' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'rate_limit_hits' }),
      this.createRlsPolicy({
        schema: 'public',
        table: 'profiles',
        policy: {
          naming: { kind: 'wire', prefix: 'profiles_owner_read', hash: 'b499dcb9' },
          tableName: 'profiles',
          namespaceId: 'public',
          operation: 'select',
          roles: ['authenticated'],
          using: 'id = auth.uid()',
          permissive: true,
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
