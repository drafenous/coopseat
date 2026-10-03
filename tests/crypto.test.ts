import { afterEach, describe, expect, it, vi } from 'vitest';
import { decrypt, encrypt, pkceChallenge, safeEqual, seal, unseal } from '@/server/crypto';

describe('crypto', () => {
  afterEach(() => vi.useRealTimers());

  it('computes the RFC 7636 S256 challenge', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('round-trips AES-GCM payloads with a fresh IV each time', () => {
    const a = encrypt('segredo');
    expect(a).not.toBe(encrypt('segredo'));
    expect(decrypt(a)).toBe('segredo');
  });

  it('rejects tampered ciphertext', () => {
    const raw = Buffer.from(encrypt('segredo'), 'base64url');
    raw[raw.length - 1] ^= 1;
    expect(() => decrypt(raw.toString('base64url'))).toThrow();
  });

  it('expires sealed tokens', () => {
    vi.useFakeTimers();
    const token = seal({ user: 'u1' }, 60);
    expect(unseal(token)).toEqual({ user: 'u1' });
    vi.advanceTimersByTime(61_000);
    expect(unseal(token)).toBeNull();
    expect(unseal('lixo')).toBeNull();
  });

  it('compares strings without leaking length mismatches as errors', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
