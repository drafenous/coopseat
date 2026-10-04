/**
 * Watch-party permissions. Watching and chat need an age-verified (18+) account
 * with a confirmed email and a nickname; hosting also needs an aal2 session when
 * 2FA is enabled. Accounts themselves are 12+, so a verified age is the only
 * thing keeping minors out of rooms.
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
    watch: gate(base),
    chat: gate(base),
    /** Voice chat isn't offered; kept because desktop 0.1 reads `permissions.voice` unguarded. */
    voice: gate(base),
    host: gate([...base, ['mfa', !input.mfaEnabled || input.aal === 'aal2']]),
  };
}
