import { z } from 'zod';
import { NICKNAME_PATTERN } from './account';

const nickname = z.string().trim().regex(NICKNAME_PATTERN, 'nickname_format');
const profileId = z.uuid('invalid_input');
const perm = z.boolean().optional();

export const roomPasswordSchema = z
  .string()
  .min(4, 'party_password_format')
  .max(64, 'party_password_format');

export const updateRoomSchema = z
  .object({
    password: roomPasswordSchema.nullable().optional(),
    requireApproval: z.boolean().optional(),
    whitelistEnabled: z.boolean().optional(),
    defaultLayout: z.enum(['stage', 'grid']).optional(),
  })
  .strict();

export const whitelistEntrySchema = z
  .object({ nickname, canStream: z.boolean().default(false) })
  .strict();

export const profileRefSchema = z.object({ profileId }).strict();

export const moderatorSchema = z
  .object({
    nickname,
    canKick: perm,
    canBan: perm,
    canStopStreams: perm,
    canApprove: perm,
    canGrantStream: perm,
    canDeleteMessages: perm,
  })
  .strict();

export const banSchema = z
  .object({
    profileId,
    reason: z.string().trim().max(300).optional(),
    hours: z
      .number()
      .int()
      .min(1)
      .max(24 * 365)
      .optional(),
  })
  .strict();

export const approvalSchema = z
  .object({ profileId, approve: z.boolean() })
  .strict();

export const joinSchema = z
  .object({
    password: z.string().max(64).optional(),
    sessionId: z.uuid().optional(),
  })
  .strict();

export const turnSchema = z
  .object({ roomToken: z.string().min(20).max(4096) })
  .strict();
