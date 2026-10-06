import { describe, expect, it } from 'vitest';
import { permissionsFor, type GateInput } from '@/lib/gates';

const ready: GateInput = {
  emailConfirmed: true,
  nicknameSet: true,
  ageVerified: true,
  mfaEnabled: false,
  aal: 'aal1',
};

describe('watch-party permissions', () => {
  it('locks every party feature for a fresh account', () => {
    const p = permissionsFor({
      emailConfirmed: false,
      nicknameSet: false,
      ageVerified: false,
      mfaEnabled: false,
      aal: 'aal1',
    });
    expect(p.watch.missing).toEqual(['email', 'nickname', 'age']);
    expect(p.chat.missing).toEqual(['email', 'nickname', 'age']);
    expect(p.host.allowed).toBe(false);
  });

  it('requires age verification for watching, chat, voice and hosting', () => {
    const p = permissionsFor({ ...ready, ageVerified: false });
    expect(p.watch.missing).toEqual(['age']);
    expect(p.chat.missing).toEqual(['age']);
    expect(p.voice.missing).toEqual(['age']);
    expect(p.host.missing).toEqual(['age']);
  });

  it('requires an aal2 session to host only when 2FA is enabled', () => {
    expect(permissionsFor(ready).host.allowed).toBe(true);
    expect(permissionsFor({ ...ready, mfaEnabled: true }).host.missing).toEqual(
      ['mfa'],
    );
    expect(permissionsFor({ ...ready, mfaEnabled: true }).chat.allowed).toBe(
      true,
    );
    expect(
      permissionsFor({ ...ready, mfaEnabled: true, aal: 'aal2' }).host.allowed,
    ).toBe(true);
  });
});
