import { describe, expect, it } from 'vitest';
import { nicknameSchema, passwordSchema, signupSchema, updateMeSchema } from '@/lib/validation/account';

const signup = {
  email: 'Pessoa@Exemplo.com ',
  password: 'senhaForte1',
  nickname: 'rodri_01',
  acceptTerms: true,
  confirmMinAge: true,
};

describe('account validation', () => {
  it('accepts valid nicknames and rejects bad or reserved ones', () => {
    expect(nicknameSchema.safeParse('Rodri_01').success).toBe(true);
    for (const bad of ['ab', 'a'.repeat(21), 'com espaço', 'acentuação', 'admin', 'CoopSeatOficial']) {
      expect(nicknameSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('requires letters and digits in passwords', () => {
    expect(passwordSchema.safeParse('senhaForte1').success).toBe(true);
    for (const bad of ['curta1', 'somenteletras', '1234567890', 'a1'.repeat(37)]) {
      expect(passwordSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('normalizes the email and requires terms and the 12+ declaration', () => {
    const parsed = signupSchema.parse(signup);
    expect(parsed.email).toBe('pessoa@exemplo.com');
    expect(signupSchema.safeParse({ ...signup, confirmMinAge: false }).success).toBe(false);
    expect(signupSchema.safeParse({ ...signup, acceptTerms: false }).success).toBe(false);
  });

  it('rejects an empty account update', () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
    expect(updateMeSchema.safeParse({ nickname: 'novo_nick' }).success).toBe(true);
  });
});
