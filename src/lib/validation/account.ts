import { z } from 'zod';

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
  .string({ error: 'Informe um apelido.' })
  .trim()
  .regex(NICKNAME_PATTERN, 'O apelido deve ter de 3 a 20 caracteres: letras, números ou _.')
  .refine((n) => !isReservedNickname(n), 'Esse apelido é reservado.');

export const emailSchema = z
  .string({ error: 'Informe um e-mail.' })
  .trim()
  .toLowerCase()
  .max(254, 'E-mail muito longo.')
  .pipe(z.email({ error: 'E-mail inválido.' }));

export const passwordSchema = z
  .string({ error: 'Informe uma senha.' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.')
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), 'A senha deve ter letras e números.');

export const captchaSchema = z.string().max(4096).optional();

export const TERMS_VERSION = '2026-10-01';

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  nickname: nicknameSchema,
  acceptTerms: z.literal(true, { error: 'É preciso aceitar os Termos de Uso e a Política de Privacidade.' }),
  confirmAdult: z.literal(true, { error: 'O CoopSeat é exclusivo para maiores de 18 anos.' }),
  captchaToken: captchaSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.').max(72),
  captchaToken: captchaSchema,
});

export const forgotSchema = z.object({ email: emailSchema, captchaToken: captchaSchema });

export const resetSchema = z.object({ password: passwordSchema });

export const setPasswordSchema = z.object({ password: passwordSchema });

export const updateMeSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    email: emailSchema.optional(),
    acceptTerms: z.literal(true).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nada para atualizar.');

export const deleteMeSchema = z.object({ confirm: z.string().min(1, 'Digite seu apelido para confirmar.') });

export const OAUTH_PROVIDERS = ['google', 'facebook', 'x', 'discord'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export const oauthProviderSchema = z.enum(OAUTH_PROVIDERS, { error: 'Provedor não suportado.' });

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  discord: 'Discord',
};

export const pkceChallengeSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'Desafio PKCE inválido.');
export const pkceVerifierSchema = z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/, 'Verificador PKCE inválido.');

export const totpCodeSchema = z.string().trim().regex(/^\d{6}$/, 'O código tem 6 dígitos.');
