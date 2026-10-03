import { describe, expect, it, vi } from 'vitest';
import { auth, toApiError } from '@/server/auth-errors';
import { GoTrueError } from '@/server/gotrue';
import { ApiError, errorResponse } from '@/server/http';

describe('GoTrue error mapping', () => {
  it('maps known codes to the right status', async () => {
    const err = await auth(Promise.reject(new GoTrueError(400, 'invalid_credentials', 'Invalid login credentials'))).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, code: 'invalid_credentials' });
  });

  it('localizes the message per request locale', async () => {
    const err = toApiError(new GoTrueError(400, 'invalid_credentials', 'x')) as ApiError;
    const body = async (res: Response) => (await res.json()).error.message;
    expect(await body(errorResponse(err))).toBe('Incorrect e-mail or password.');
    expect(await body(errorResponse(err, 'pt-BR'))).toBe('E-mail ou senha incorretos.');
  });

  it('falls back by status and hides unknown upstream details', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toApiError(new GoTrueError(429, 'whatever', 'x'))).toMatchObject({ status: 429, code: 'rate_limited' });
    expect(toApiError(new GoTrueError(401, 'whatever', 'x'))).toMatchObject({ status: 401, code: 'unauthenticated' });
    const unknown = toApiError(new GoTrueError(500, 'db_down', 'internal details')) as ApiError;
    expect(unknown).toMatchObject({ status: 502, code: 'auth_unavailable' });
    expect(unknown.message).not.toContain('internal details');
  });

  it('passes through non-GoTrue errors', () => {
    const plain = new Error('x');
    expect(toApiError(plain)).toBe(plain);
  });
});
