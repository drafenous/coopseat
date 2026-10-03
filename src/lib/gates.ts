/**
 * Watch-party permissions. Guests may watch anonymously; chat and voice need an
 * age-verified account; hosting also needs a confirmed email, a nickname and,
 * when 2FA is enabled, an aal2 session.
 */
export type GateInput = {
  emailConfirmed: boolean;
  nicknameSet: boolean;
  ageVerified: boolean;
  mfaEnabled: boolean;
  aal: 'aal1' | 'aal2';
};

export type Gate = { allowed: boolean; missing: GateRequirement[] };
export type GateRequirement = 'email' | 'nickname' | 'age' | 'mfa';

function gate(checks: [GateRequirement, boolean][]): Gate {
  const missing = checks.filter(([, ok]) => !ok).map(([req]) => req);
  return { allowed: missing.length === 0, missing };
}

export function permissionsFor(input: GateInput) {
  const base: [GateRequirement, boolean][] = [
    ['email', input.emailConfirmed],
    ['nickname', input.nicknameSet],
    ['age', input.ageVerified],
  ];
  return {
    watch: gate([]),
    chat: gate(base),
    voice: gate(base),
    host: gate([...base, ['mfa', !input.mfaEnabled || input.aal === 'aal2']]),
  };
}

export const GATE_MESSAGES: Record<GateRequirement, string> = {
  email: 'Confirme seu e-mail.',
  nickname: 'Escolha um apelido.',
  age: 'Verifique sua idade (18+).',
  mfa: 'Confirme a autenticação em duas etapas.',
};
