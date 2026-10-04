#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2ce8ed99f683ffe3565107d651e1d87d3a75403c3f72fe66d0a0d8618fa75358/contract';
import startContract from '../../snapshots/2ce8ed99f683ffe3565107d651e1d87d3a75403c3f72fe66d0a0d8618fa75358/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/865c0af292ccb63258648dfec3b64677416f9f1c782cac36464cb735724f6435/contract';
import endContract from '../../snapshots/865c0af292ccb63258648dfec3b64677416f9f1c782cac36464cb735724f6435/contract.json' with { type: 'json' };
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
        table: 'party_moderation_events',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('detail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('roomId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('sessionId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('targetId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_policy',
        columns: [
          col('chatEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('enabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('id', 'text', {
            notNull: true,
            default: lit('global'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('maxParticipants', 'int4', {
            notNull: true,
            default: lit(10),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('maxStreamers', 'int4', {
            notNull: true,
            default: lit(10),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerGraceSeconds', 'int4', {
            notNull: true,
            default: lit(60),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('sessionMaxHours', 'int4', {
            notNull: true,
            default: lit(12),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('party_policy_grace_0746bd0e', '"ownerGraceSeconds" BETWEEN 10 AND 600'),
          checkExpression('party_policy_hours_8e0e6ad0', '"sessionMaxHours" BETWEEN 1 AND 24'),
          checkExpression(
            'party_policy_participants_9048ef65',
            '"maxParticipants" BETWEEN 2 AND 50',
          ),
          checkExpression('party_policy_singleton_3422eee5', "id = 'global'"),
          checkExpression('party_policy_streamers_43c6d4b2', '"maxStreamers" BETWEEN 1 AND 10'),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_room_bans',
        columns: [
          col('bannedBy', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('roomId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'party_room_bans_reason_7ccf3891',
            'reason IS NULL OR length(reason) <= 300',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_room_moderators',
        columns: [
          col('canApprove', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('canBan', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('canDeleteMessages', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('canGrantStream', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('canKick', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('canStopStreams', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
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
          col('roomId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_room_whitelist',
        columns: [
          col('canStream', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
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
          col('roomId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_rooms',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('defaultLayout', 'text', {
            notNull: true,
            default: lit('stage'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('maxParticipants', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('ownerId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('requireApproval', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('whitelistEnabled', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
        ],
        constraints: [
          primaryKey(['ownerId']),
          checkExpression(
            'party_rooms_layout_8a3d9b9f',
            "\"defaultLayout\" IN ('stage', 'grid', 'split', 'focus')",
          ),
          checkExpression(
            'party_rooms_participants_55ed6ac1',
            '"maxParticipants" IS NULL OR "maxParticipants" BETWEEN 2 AND 50',
          ),
          checkExpression(
            'party_rooms_protected_79f84d77',
            '"passwordHash" IS NOT NULL OR "requireApproval" OR "whitelistEnabled"',
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_session_participants',
        columns: [
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('joinedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('leftAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('removal', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('removedBy', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('sessionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'party_session_participants_removal_44cb63c3',
            "removal IS NULL OR removal IN ('kick', 'ban')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'party_sessions',
        columns: [
          col('endReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('endedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('roomId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('startedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'party_sessions_end_reason_56813f84',
            "\"endReason\" IS NULL OR \"endReason\" IN ('owner_ended', 'owner_timeout', 'max_duration', 'sanction', 'operator')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'platform_sanctions',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('profileId', '"uuid"', {
            notNull: true,
            codecRef: { codecId: 'pg/uuid@1', typeParams: {} },
          }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('scope', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'platform_sanctions_scope_17110c0c',
            "scope IN ('platform', 'party_host', 'party_stream', 'party_join', 'party_chat')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'party_room_bans',
        constraint: 'party_room_bans_roomId_profileId_key',
        columns: ['roomId', 'profileId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'party_room_moderators',
        constraint: 'party_room_moderators_roomId_profileId_key',
        columns: ['roomId', 'profileId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'party_room_whitelist',
        constraint: 'party_room_whitelist_roomId_profileId_key',
        columns: ['roomId', 'profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_moderation_events',
        index: 'party_moderation_events_roomId_createdAt_idx_71ac5cd0',
        columns: ['roomId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_moderation_events',
        index: 'party_moderation_events_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_room_bans',
        index: 'party_room_bans_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_room_bans',
        index: 'party_room_bans_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_room_moderators',
        index: 'party_room_moderators_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_room_moderators',
        index: 'party_room_moderators_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_room_whitelist',
        index: 'party_room_whitelist_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_room_whitelist',
        index: 'party_room_whitelist_roomId_idx_fe51d647',
        columns: ['roomId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_session_participants',
        index: 'party_session_participants_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_session_participants',
        index: 'party_session_participants_sessionId_idx_29f415d4',
        columns: ['sessionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_sessions',
        index: 'party_sessions_one_active_f6101b30',
        columns: ['roomId'],
        extras: { where: '"endedAt" IS NULL', unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'party_sessions',
        index: 'party_sessions_startedAt_idx_cac56236',
        columns: ['startedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'platform_sanctions',
        index: 'platform_sanctions_profileId_idx_d9cdfcaf',
        columns: ['profileId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_moderation_events',
        foreignKey: {
          name: 'party_moderation_events_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'party_rooms', columns: ['ownerId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_room_bans',
        foreignKey: {
          name: 'party_room_bans_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'party_rooms', columns: ['ownerId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_room_bans',
        foreignKey: {
          name: 'party_room_bans_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_room_moderators',
        foreignKey: {
          name: 'party_room_moderators_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'party_rooms', columns: ['ownerId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_room_moderators',
        foreignKey: {
          name: 'party_room_moderators_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_room_whitelist',
        foreignKey: {
          name: 'party_room_whitelist_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'party_rooms', columns: ['ownerId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_room_whitelist',
        foreignKey: {
          name: 'party_room_whitelist_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_rooms',
        foreignKey: {
          name: 'party_rooms_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_session_participants',
        foreignKey: {
          name: 'party_session_participants_sessionId_fkey',
          columns: ['sessionId'],
          references: { schema: 'public', table: 'party_sessions', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_session_participants',
        foreignKey: {
          name: 'party_session_participants_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'party_sessions',
        foreignKey: {
          name: 'party_sessions_roomId_fkey',
          columns: ['roomId'],
          references: { schema: 'public', table: 'party_rooms', columns: ['ownerId'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'platform_sanctions',
        foreignKey: {
          name: 'platform_sanctions_profileId_fkey',
          columns: ['profileId'],
          references: { schema: 'public', table: 'profiles', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_moderation_events' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_policy' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_room_bans' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_room_moderators' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_room_whitelist' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_rooms' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_session_participants' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'party_sessions' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'platform_sanctions' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
