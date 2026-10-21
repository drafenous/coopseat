import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as exchange } from '@/app/api/auth/desktop/exchange/route';
import { POST as forgot } from '@/app/api/auth/password/forgot/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as resend } from '@/app/api/auth/resend/route';
import { POST as webhook } from '@/app/api/identity/webhooks/[provider]/route';
import { GET as nicknameAvailable } from '@/app/api/nicknames/available/route';
import { pkceChallenge, randomToken } from '@/server/crypto';
import { gotrue, GoTrueError, type AuthTokens } from '@/server/gotrue';
import { signMockPayload } from '@/server/identity/providers/mock';
import { createTicket } from '@/server/tickets';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
  tryLockedRateLimit: async () => 'unsupported' as const,
}));
vi.mock('@/server/gotrue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/gotrue')>();
  return {
    ...actual,
    gotrue: {
      ...actual.gotrue,
      passwordGrant: vi.fn(),
      recover: vi.fn(),
      resendSignup: vi.fn(),
    },
  };
});

const ctx = undefined as never;
const tokens = (factors: AuthTokens['user']['factors'] = []): AuthTokens => ({
  access_token: 'access-jwt',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'a@b.com',
    factors,
  },
});

function request(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    raw?: string;
  } = {},
) {
  return new NextRequest(`https://coopseat.com${path}`, {
    method: init.method ?? 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.7',
      ...init.headers,
    },
    body:
      init.raw ??
      (init.body === undefined ? undefined : JSON.stringify(init.body)),
  });
}
const desktop = { 'x-coopseat-client': 'desktop' };
const web = { origin: 'https://coopseat.com' };
const credentials = { email: 'a@b.com', password: 'senhaForte1' };

beforeEach(() => {
  fake.current = createFakeDb();
  vi.mocked(gotrue.passwordGrant).mockReset();
  vi.mocked(gotrue.recover).mockReset();
  vi.mocked(gotrue.resendSignup).mockReset();
  vi.mocked(gotrue.recover).mockResolvedValue(undefined);
  vi.mocked(gotrue.resendSignup).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('POST /api/auth/login', () => {
  it('requires captcha for a desktop header when Turnstile is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-secret');
    vi.mocked(gotrue.passwordGrant).mockResolvedValue(tokens());

    const res = await login(
      request('/api/auth/login', { body: credentials, headers: desktop }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('captcha_required');
    expect(gotrue.passwordGrant).not.toHaveBeenCalled();
  });

  it('returns an open-app ticket for a desktop challenge and cookies otherwise', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-secret');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true })),
    );
    vi.mocked(gotrue.passwordGrant).mockResolvedValue(tokens());
    const challenge = pkceChallenge(randomToken(32));

    const res = await login(
      request('/api/auth/login', {
        body: {
          ...credentials,
          captchaToken: 'ok',
          desktopChallenge: challenge,
        },
        headers: web,
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const to = new URL(body.openApp, 'https://coopseat.com').searchParams.get(
      'to',
    );
    expect(to).toMatch(
      /^coopseat:\/\/auth\/callback\?ticket=[A-Za-z0-9_-]{43}$/,
    );
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(JSON.stringify(body)).not.toContain('access-jwt');
    expect(fake.current.data.AuthTicket).toHaveLength(1);

    const cookies = await login(
      request('/api/auth/login', {
        body: { ...credentials, captchaToken: 'ok' },
        headers: web,
      }),
      ctx,
    );
    expect(cookies.status).toBe(200);
    expect(cookies.headers.get('set-cookie')).toMatch(/cs_at=.*HttpOnly/i);
    expect(JSON.stringify(await cookies.json())).not.toContain('openApp');
  });

  it('sets httpOnly cookies for the web and never returns tokens', async () => {
    vi.mocked(gotrue.passwordGrant).mockResolvedValue(tokens());
    const res = await login(
      request('/api/auth/login', { body: credentials, headers: web }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).not.toContain('access-jwt');
    expect(res.headers.get('set-cookie')).toMatch(/cs_at=.*HttpOnly/i);
  });

  it('does not spend the email budget on captcha-less logins', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-secret');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true })),
    );
    vi.mocked(gotrue.passwordGrant).mockResolvedValue(tokens());

    for (let i = 0; i < 10; i++) {
      const res = await login(
        request('/api/auth/login', {
          body: credentials,
          headers: { ...web, 'x-forwarded-for': `203.0.113.${i + 1}` },
        }),
        ctx,
      );
      expect(res.status).toBe(400);
    }
    expect(gotrue.passwordGrant).not.toHaveBeenCalled();
    expect(
      fake.current.data.RateLimitHit.some((hit) => hit.key === 'login:a@b.com'),
    ).toBe(false);

    const res = await login(
      request('/api/auth/login', {
        body: { ...credentials, captchaToken: 'ok' },
        headers: { ...web, 'x-forwarded-for': '203.0.113.50' },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(gotrue.passwordGrant).toHaveBeenCalledOnce();
  });

  it('requires captcha on the web when Turnstile is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-secret');
    const res = await login(
      request('/api/auth/login', { body: credentials, headers: web }),
      ctx,
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('captcha_required');
    expect(gotrue.passwordGrant).not.toHaveBeenCalled();
  });

  it('rejects cookie-mode requests from another origin', async () => {
    const res = await login(
      request('/api/auth/login', {
        body: credentials,
        headers: { origin: 'https://evil.example' },
      }),
      ctx,
    );
    expect(res.status).toBe(403);
  });

  it('asks for the TOTP code when the account has a verified factor', async () => {
    vi.mocked(gotrue.passwordGrant).mockResolvedValue(
      tokens([{ id: 'f1', factor_type: 'totp', status: 'verified' }]),
    );
    const body = await (
      await login(
        request('/api/auth/login', { body: credentials, headers: desktop }),
        ctx,
      )
    ).json();
    expect(body).toMatchObject({ mfaRequired: true, factors: [{ id: 'f1' }] });
    expect(typeof body.mfaToken).toBe('string');
    expect(body.session).toBeUndefined();
  });

  it('maps wrong credentials and validates input', async () => {
    vi.mocked(gotrue.passwordGrant).mockRejectedValue(
      new GoTrueError(400, 'invalid_credentials', 'Invalid login credentials'),
    );
    const res = await login(
      request('/api/auth/login', { body: credentials, headers: desktop }),
      ctx,
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe(
      'Incorrect e-mail or password.',
    );

    const pt = await login(
      request('/api/auth/login', {
        body: credentials,
        headers: { ...desktop, 'accept-language': 'pt-BR,pt;q=0.9' },
      }),
      ctx,
    );
    expect((await pt.json()).error.message).toBe('E-mail ou senha incorretos.');

    const invalid = await login(
      request('/api/auth/login', {
        body: { email: 'x', password: '' },
        headers: desktop,
      }),
      ctx,
    );
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.fields).toHaveProperty('email');
  });
});

describe('password reset and confirmation resend', () => {
  async function exhaustWithoutCaptcha(
    post: (req: NextRequest, ctx: never) => Promise<Response>,
    path: string,
  ) {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'turnstile-secret');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ success: true })),
    );
    for (let i = 0; i < 5; i++) {
      const res = await post(
        request(path, {
          body: { email: 'a@b.com' },
          headers: { ...web, 'x-forwarded-for': `203.0.113.${i + 1}` },
        }),
        ctx,
      );
      expect(res.status).toBe(400);
    }
    expect(
      fake.current.data.RateLimitHit.some(
        (hit) => hit.key === 'forgot:a@b.com',
      ),
    ).toBe(false);
  }

  it('does not spend the email budget on captcha-less resets', async () => {
    await exhaustWithoutCaptcha(forgot, '/api/auth/password/forgot');
    expect(gotrue.recover).not.toHaveBeenCalled();

    const res = await forgot(
      request('/api/auth/password/forgot', {
        body: { email: 'a@b.com', captchaToken: 'ok' },
        headers: { ...web, 'x-forwarded-for': '203.0.113.50' },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(gotrue.recover).toHaveBeenCalledOnce();
  });

  it('does not spend the email budget on captcha-less resends', async () => {
    await exhaustWithoutCaptcha(resend, '/api/auth/resend');
    expect(gotrue.resendSignup).not.toHaveBeenCalled();

    const res = await resend(
      request('/api/auth/resend', {
        body: { email: 'a@b.com', captchaToken: 'ok' },
        headers: { ...web, 'x-forwarded-for': '203.0.113.50' },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(gotrue.resendSignup).toHaveBeenCalledOnce();
  });
});

describe('POST /api/auth/desktop/exchange', () => {
  it('exchanges a ticket once, only with the PKCE verifier', async () => {
    const verifier = randomToken(32);
    const ticket = await createTicket(
      'desktop_login',
      { tokens: tokens() },
      pkceChallenge(verifier),
    );

    const ok = await exchange(
      request('/api/auth/desktop/exchange', {
        body: { ticket, verifier },
        headers: desktop,
      }),
      ctx,
    );
    expect((await ok.json()).session.accessToken).toBe('access-jwt');

    const replay = await exchange(
      request('/api/auth/desktop/exchange', {
        body: { ticket, verifier },
        headers: desktop,
      }),
      ctx,
    );
    expect(replay.status).toBe(400);
    expect((await replay.json()).error.code).toBe('ticket_invalid');
  });

  it('rejects a stolen ticket without the verifier', async () => {
    const ticket = await createTicket(
      'desktop_login',
      { tokens: tokens() },
      pkceChallenge(randomToken(32)),
    );
    const res = await exchange(
      request('/api/auth/desktop/exchange', {
        body: { ticket, verifier: randomToken(32) },
        headers: desktop,
      }),
      ctx,
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/nicknames/available', () => {
  it('explains invalid nicknames and reports taken ones case-insensitively', async () => {
    fake.current.data.Profile.push({
      id: 'p1',
      nickname: 'Rodri',
      nicknameKey: 'rodri',
    });
    const invalid = await (
      await nicknameAvailable(
        request('/api/nicknames/available?n=a', { method: 'GET' }),
        ctx,
      )
    ).json();
    expect(invalid.available).toBe(false);
    expect(invalid.reason).toBeTruthy();
    const taken = await (
      await nicknameAvailable(
        request('/api/nicknames/available?n=RODRI', { method: 'GET' }),
        ctx,
      )
    ).json();
    expect(taken.available).toBe(false);
    const free = await (
      await nicknameAvailable(
        request('/api/nicknames/available?n=outro_nick', { method: 'GET' }),
        ctx,
      )
    ).json();
    expect(free.available).toBe(true);
  });
});

describe('POST /api/identity/webhooks/[provider]', () => {
  const params = (provider: string) => ({
    params: Promise.resolve({ provider }),
  });

  it('rejects unsigned payloads and unknown providers', async () => {
    const raw = JSON.stringify({
      sessionId: 's',
      status: 'approved',
      isAdult: true,
      document: null,
    });
    const bad = await webhook(
      request('/api/identity/webhooks/mock', {
        raw,
        headers: { 'x-mock-signature': 'errada' },
      }),
      params('mock'),
    );
    expect(bad.status).toBe(401);
    const unknown = await webhook(
      request('/api/identity/webhooks/outro', { raw }),
      params('outro'),
    );
    expect(unknown.status).toBe(404);
  });

  it('applies a signed result', async () => {
    fake.current.data.Profile.push({ id: 'p1', ageStatus: 'PENDING' });
    fake.current.data.IdentityVerification.push({
      id: 'v1',
      profileId: 'p1',
      provider: 'mock',
      providerSessionId: 's1',
      status: 'created',
      completedAt: null,
    });
    const raw = JSON.stringify({
      sessionId: 's1',
      status: 'approved',
      isAdult: true,
      document: { country: 'BR', number: '1' },
    });
    const res = await webhook(
      request('/api/identity/webhooks/mock', {
        raw,
        headers: { 'x-mock-signature': signMockPayload(raw) },
      }),
      params('mock'),
    );
    expect(await res.json()).toMatchObject({
      applied: true,
      status: 'approved',
    });
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('VERIFIED');
  });
});
