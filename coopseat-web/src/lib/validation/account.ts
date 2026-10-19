import { z } from 'zod';

// Messages are error codes, resolved against the i18n dictionaries (`errors`).

export const NICKNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export const RESERVED_NICKNAMES = new Set([
  'coopseat',
  'admin',
  'administrador',
  'moderador',
  'mod',
  'suporte',
  'support',
  'staff',
  'equipe',
  'oficial',
  'official',
  'root',
  'system',
  'sistema',
  'null',
  'undefined',
  'anonimo',
  'anonymous',
  'convidado',
  'guest',
  'host',
]);

export function isReservedNickname(nickname: string): boolean {
  const key = nickname.toLowerCase();
  return RESERVED_NICKNAMES.has(key) || key.startsWith('coopseat');
}

export const nicknameSchema = z
  .string({ error: 'nickname_required' })
  .trim()
  .regex(NICKNAME_PATTERN, 'nickname_format')
  .refine((n) => !isReservedNickname(n), 'nickname_reserved');

export const emailSchema = z
  .string({ error: 'email_required' })
  .trim()
  .toLowerCase()
  .max(254, 'email_too_long')
  .pipe(z.email({ error: 'email_invalid' }));

export const passwordSchema = z
  .string({ error: 'password_required' })
  .min(8, 'password_too_short')
  .max(72, 'password_too_long')
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), 'password_weak');

export const captchaSchema = z.string().max(4096).optional();

export const TERMS_VERSION = '2026-10-04';

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  acceptTerms: z.literal(true, { error: 'terms_required' }),
  confirmMinAge: z.literal(true, { error: 'min_age_required' }),
  captchaToken: captchaSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'password_required').max(72),
  captchaToken: captchaSchema,
});

export const forgotSchema = z.object({
  email: emailSchema,
  captchaToken: captchaSchema,
});

export const resetSchema = z.object({ password: passwordSchema });

export const setPasswordSchema = z.object({ password: passwordSchema });

export const updateMeSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    email: emailSchema.optional(),
    acceptTerms: z.literal(true).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'nothing_to_update');

export const deleteMeSchema = z.object({
  confirm: z.string().min(1, 'confirm_required'),
});

export const OAUTH_PROVIDERS = ['google', 'discord'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS, {
  error: 'provider_unsupported',
});

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  discord: 'Discord',
};

export const pkceChallengeSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, 'pkce_challenge_invalid');
export const pkceVerifierSchema = z
  .string()
  .regex(/^[A-Za-z0-9._~-]{43,128}$/, 'pkce_verifier_invalid');

export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'totp_format');
