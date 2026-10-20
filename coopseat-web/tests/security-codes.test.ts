import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as challenge } from '@/app/api/auth/mfa/challenge/route';
import { POST as disable } from '@/app/api/auth/mfa/disable/route';
import { qrImageSrc, securityCodeFile } from '@/lib/mfa';
import { en } from '@/i18n/dictionaries/en';
import { ptBR } from '@/i18n/dictionaries/pt-BR';
import { gotrue, type AuthTokens } from '@/server/gotrue';
import { verifyAccessToken } from '@/server/jwt';
import { sealMfaToken, unsealMfaToken } from '@/server/oauth-state';
import {
  consumeSecurityCode,
  generateSecurityCode,
  hashSecurityCode,
  normalizeSecurityCode,
  replaceSecurityCodes,
} from '@/server/security-codes';
import { createFakeDb, type FakeDb } from './fake-db';

const USER = '00000000-0000-4000-8000-000000000001';
const FACTOR = '11111111-1111-4111-8111-111111111111';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
}));
vi.mock('@/server/gotrue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/gotrue')>();
  return {
    ...actual,
    gotrue: {
      ...actual.gotrue,
      challenge: vi.fn(),
      verifyFactor: vi.fn(),
      unenroll: vi.fn(),
      getUser: vi.fn(),
      admin: { ...actual.gotrue.admin, deleteFactor: vi.fn() },
    },
  };
});
vi.mock('@/server/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

const claims = {
  sub: USER,
  role: 'authenticated' as const,
  aal: 'aal1' as const,
  session_id: 'sess-1',
  exp: 4_000_000_000,
};

const tokens = (): AuthTokens => ({
  access_token: 'access-jwt',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  user: {
    id: USER,
    factors: [
      {
        id: FACTOR,
        factor_type: 'totp',
        status: 'verified',
        friendly_name: 'App',
      },
    ],
  },
});

function request(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`https://coopseat.com${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.8',
      'x-coopseat-client': 'desktop',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  fake.current = createFakeDb();
  vi.mocked(gotrue.challenge).mockReset();
  vi.mocked(gotrue.verifyFactor).mockReset();
  vi.mocked(gotrue.unenroll).mockReset();
  vi.mocked(gotrue.getUser).mockReset();
  vi.mocked(gotrue.admin.deleteFactor).mockReset();
  vi.mocked(verifyAccessToken).mockReset();
  vi.mocked(verifyAccessToken).mockResolvedValue(claims);
  vi.mocked(gotrue.getUser).mockResolvedValue(tokens().user);
});

describe('security codes', () => {
  it('normalizes, hashes and consumes a code only once', async () => {
    const code = generateSecurityCode();
    expect(normalizeSecurityCode(` ${code.toLowerCase()} `)).toBe(code);
    expect(normalizeSecurityCode('0000-0000')).toBeNull();
    expect(hashSecurityCode(code)).toHaveLength(64);

    const [first] = await replaceSecurityCodes(USER);
    expect(first).toBeDefined();
    expect(await consumeSecurityCode(USER, first!)).toBe(true);
    expect(await consumeSecurityCode(USER, first!)).toBe(false);
    expect(fake.current.data.SecurityCode.filter((row) => !row.usedAt)).toHaveLength(9);
  });

  it('keeps the download text in both languages', () => {
    expect(en.account.securityCodesFile('today')).toContain('CoopSeat');
    expect(ptBR.account.securityCodesFile('hoje')).toContain('CoopSeat');
    expect(en.mfa.useSecurityCode).not.toBe(ptBR.mfa.useSecurityCode);
    expect(securityCodeFile(en.account.securityCodesFile('today'), ['ABCD-EFGH'])).toContain(
      'ABCD-EFGH',
    );
    expect(qrImageSrc('<?xml version="1.0"?><svg></svg>')).toMatch(
      /^data:image\/svg\+xml/,
    );
    expect(qrImageSrc('data:image/svg+xml,ok')).toBe('data:image/svg+xml,ok');
  });
});

describe('pending MFA session', () => {
  it('stays inside a browser cookie even when the grant carries a large user', () => {
    const fat = tokens();
    fat.access_token = 'a'.repeat(2200);
    fat.refresh_token = 'r'.repeat(128);
    fat.user = {
      ...fat.user,
      email: 'person@example.com',
      identities: [
        {
          id: 'identity-1',
          provider: 'google',
          identity_data: { email: 'person@example.com', name: 'n'.repeat(800) },
        },
      ],
    };
    const sealed = sealMfaToken(fat);
    expect(sealed.length).toBeLessThan(3800);
    const pending = unsealMfaToken(sealed);
    expect(pending?.access_token).toBe(fat.access_token);
    expect(pending?.refresh_token).toBe(fat.refresh_token);
    expect(pending?.user.id).toBe(USER);
    expect(pending?.user.factors?.[0]?.id).toBe(FACTOR);
    expect(pending?.user.email).toBeUndefined();
  });
});

describe('POST /api/auth/mfa/challenge', () => {
  it('verifies a TOTP code with GoTrue and does not seal a step-up', async () => {
    vi.mocked(gotrue.challenge).mockResolvedValue({ id: 'ch-1' });
    vi.mocked(gotrue.verifyFactor).mockResolvedValue(tokens());
    const res = await challenge(
      request('/api/auth/mfa/challenge', {
        mfaToken: sealMfaToken(tokens()),
        code: '123456',
      }),
      undefined as never,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(gotrue.verifyFactor).toHaveBeenCalledOnce();
    expect(body.session.stepUp).toBeUndefined();
  });

  it('accepts a security code without calling GoTrue verify', async () => {
    const [code] = await replaceSecurityCodes(USER);
    const res = await challenge(
      request('/api/auth/mfa/challenge', {
        mfaToken: sealMfaToken(tokens()),
        code,
      }),
      undefined as never,
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(gotrue.verifyFactor).not.toHaveBeenCalled();
    expect(gotrue.challenge).not.toHaveBeenCalled();
    expect(typeof body.session.stepUp).toBe('string');
    expect(await consumeSecurityCode(USER, code!)).toBe(false);
  });
});

describe('POST /api/auth/mfa/disable', () => {
  const call = (code: string) =>
    disable(
      request(
        '/api/auth/mfa/disable',
        { factorId: FACTOR, code },
        { authorization: 'Bearer access-jwt' },
      ),
      undefined as never,
    );

  it('removes the factor and the codes after a TOTP code', async () => {
    await replaceSecurityCodes(USER);
    vi.mocked(gotrue.challenge).mockResolvedValue({ id: 'ch-1' });
    vi.mocked(gotrue.verifyFactor).mockResolvedValue(tokens());
    const res = await call('123456');
    expect(res.status).toBe(200);
    expect(gotrue.unenroll).toHaveBeenCalledWith('access-jwt', FACTOR);
    expect(fake.current.data.SecurityCode).toHaveLength(0);
  });

  it('removes the factor with an unused security code', async () => {
    const [code] = await replaceSecurityCodes(USER);
    const res = await call(code!);
    expect(res.status).toBe(200);
    expect(gotrue.verifyFactor).not.toHaveBeenCalled();
    expect(gotrue.admin.deleteFactor).toHaveBeenCalledWith(USER, FACTOR);
    expect(fake.current.data.SecurityCode).toHaveLength(0);
  });
});
