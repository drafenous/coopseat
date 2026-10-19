import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as discordCallback } from '@/app/api/auth/callback/discord/route';
import { unseal } from '@/server/crypto';
import { discordAuthorizeUrl, discordFailureCode } from '@/server/discord';
import { gotrue, type AuthTokens } from '@/server/gotrue';
import { startDiscordOAuth } from '@/server/oauth-state';

vi.mock('@/server/profiles', () => ({
  ensureProfile: vi.fn(async () => ({})),
}));
vi.mock('@/server/gotrue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/gotrue')>();
  return {
    ...actual,
    gotrue: {
      ...actual.gotrue,
      pkceGrant: vi.fn(),
      getUser: vi.fn(),
      identityAuthorizeUrl: vi.fn(),
      logout: vi.fn(),
    },
  };
});

const tokens = (
  factors: AuthTokens['user']['factors'] = [],
): AuthTokens => ({
  access_token: 'access-jwt',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'a@b.com',
    identities: [
      {
        id: 'identity-1',
        provider: 'discord',
        identity_data: {
          avatar_url: 'https://cdn.discordapp.com/avatars/1/a.png',
        },
      },
    ],
    factors,
  },
});

function cookieFrom(res: Response): string {
  const set = res.headers.get('set-cookie') ?? '';
  const match = /cs_oauth=([^;]+)/.exec(set);
  if (!match?.[1]) throw new Error('oauth cookie missing');
  return match[1];
}

beforeEach(() => {
  vi.mocked(gotrue.pkceGrant).mockReset();
  vi.mocked(gotrue.getUser).mockReset();
  vi.mocked(gotrue.identityAuthorizeUrl).mockReset();
});

describe('Discord OAuth', () => {
  it('starts GoTrue PKCE without extra scopes', () => {
    const url = new URL(
      discordAuthorizeUrl({ codeChallenge: 'challenge-value' }),
    );
    expect(url.origin + url.pathname).toBe(
      'https://project.supabase.co/auth/v1/authorize',
    );
    expect(url.searchParams.get('provider')).toBe('discord');
    expect(url.searchParams.get('redirect_to')).toBe(
      'https://coopseat.com/api/auth/callback/discord',
    );
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value');
    expect(url.searchParams.get('code_challenge_method')).toBe('s256');
    expect(url.searchParams.has('scopes')).toBe(false);
  });

  it('maps provider failures onto the auth error page', () => {
    expect(discordFailureCode('access_denied', false)).toBe('provider_refused');
    expect(discordFailureCode('identity_already_exists', true)).toBe(
      'provider_already_linked',
    );
    expect(discordFailureCode('email_exists', false)).toBe('email_exists');
    expect(discordFailureCode('flow_state_expired', false)).toBe(
      'login_expired',
    );
    expect(discordFailureCode('unexpected_failure', true)).toBe('link_failed');
    expect(discordFailureCode(undefined, false)).toBe('login_failed');
  });

  it('does not keep the account access token in the link cookie', async () => {
    vi.mocked(gotrue.identityAuthorizeUrl).mockResolvedValue(
      'https://discord.com/oauth2/authorize?client_id=1',
    );
    const res = await startDiscordOAuth({
      mode: 'link-web',
      linkTo: 'secret-access-token',
    });
    expect(res.headers.get('location')).toBe(
      'https://discord.com/oauth2/authorize?client_id=1',
    );
    const state = unseal<Record<string, unknown>>(cookieFrom(res));
    expect(state).toMatchObject({ provider: 'discord', mode: 'link-web' });
    expect(JSON.stringify(state)).not.toContain('secret-access-token');
  });

  it('exchanges the GoTrue code and signs the browser in', async () => {
    vi.mocked(gotrue.pkceGrant).mockResolvedValue(tokens());
    vi.mocked(gotrue.getUser).mockResolvedValue(tokens().user);
    const started = await startDiscordOAuth({ mode: 'web', next: '/account' });

    const res = await discordCallback(
      new NextRequest(
        'https://coopseat.com/api/auth/callback/discord?code=auth-code',
        { headers: { cookie: `cs_oauth=${cookieFrom(started)}` } },
      ),
    );
    expect(res.headers.get('location')).toBe('https://coopseat.com/account');
    expect(gotrue.pkceGrant).toHaveBeenCalledWith(
      'auth-code',
      expect.any(String),
    );
    expect(res.headers.get('set-cookie')).toContain('cs_at=');
  });

  it('sends a user with 2FA to the second step', async () => {
    const withFactor = tokens([
      { id: 'f1', factor_type: 'totp', status: 'verified' },
    ]);
    vi.mocked(gotrue.pkceGrant).mockResolvedValue(withFactor);
    vi.mocked(gotrue.getUser).mockResolvedValue(withFactor.user);
    const started = await startDiscordOAuth({ mode: 'web', next: '/account' });

    const res = await discordCallback(
      new NextRequest(
        'https://coopseat.com/api/auth/callback/discord?code=auth-code',
        { headers: { cookie: `cs_oauth=${cookieFrom(started)}` } },
      ),
    );
    expect(res.headers.get('location')).toBe(
      'https://coopseat.com/login/2fa?next=%2Faccount',
    );
  });

  it('refuses a callback whose cookie belongs to another provider', async () => {
    const res = await discordCallback(
      new NextRequest('https://coopseat.com/api/auth/callback/discord?code=x'),
    );
    expect(res.headers.get('location')).toBe(
      'https://coopseat.com/auth/error?code=login_expired',
    );
    expect(gotrue.pkceGrant).not.toHaveBeenCalled();
  });

  it('reports an identity that already belongs to someone else', async () => {
    const started = await startDiscordOAuth({ mode: 'web', next: '/account' });
    const res = await discordCallback(
      new NextRequest(
        'https://coopseat.com/api/auth/callback/discord?error=server_error&error_code=identity_already_exists',
        { headers: { cookie: `cs_oauth=${cookieFrom(started)}` } },
      ),
    );
    expect(res.headers.get('location')).toBe(
      'https://coopseat.com/auth/error?code=provider_already_linked',
    );
  });
});
