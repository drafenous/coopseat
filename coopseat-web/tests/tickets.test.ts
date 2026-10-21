import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pkceChallenge, randomToken } from '@/server/crypto';
import { consumeTicket, createTicket } from '@/server/tickets';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
  tryLockedRateLimit: async () => 'unsupported' as const,
}));

describe('auth tickets', () => {
  beforeEach(() => {
    fake.current = createFakeDb();
  });

  it('stores only the hash and an encrypted payload', async () => {
    const ticket = await createTicket('link', { accessToken: 'jwt-secreto' });
    const row = fake.current.data.AuthTicket[0]!;
    expect(row.id).not.toBe(ticket);
    expect(String(row.payload)).not.toContain('jwt-secreto');
  });

  it('is single use', async () => {
    const ticket = await createTicket('link', { a: 1 });
    expect(await consumeTicket(ticket, 'link')).toEqual({ a: 1 });
    expect(await consumeTicket(ticket, 'link')).toBeNull();
  });

  it('requires the matching PKCE verifier and burns the ticket on a wrong one', async () => {
    const verifier = randomToken(32);
    const ticket = await createTicket(
      'desktop_login',
      { ok: true },
      pkceChallenge(verifier),
    );
    expect(
      await consumeTicket(ticket, 'desktop_login', randomToken(32)),
    ).toBeNull();
    expect(await consumeTicket(ticket, 'desktop_login', verifier)).toBeNull();

    const again = await createTicket(
      'desktop_login',
      { ok: true },
      pkceChallenge(verifier),
    );
    expect(await consumeTicket(again, 'desktop_login')).toBeNull();
    const third = await createTicket(
      'desktop_login',
      { ok: true },
      pkceChallenge(verifier),
    );
    expect(await consumeTicket(third, 'desktop_login', verifier)).toEqual({
      ok: true,
    });
  });

  it('rejects the wrong kind, malformed tickets and expired tickets', async () => {
    const ticket = await createTicket('link', {});
    expect(await consumeTicket(ticket, 'desktop_login')).toBeNull();
    expect(await consumeTicket('curto', 'link')).toBeNull();

    const expired = await createTicket('link', {});
    fake.current.data.AuthTicket[0]!.expiresAt = new Date(
      Date.now() - 1000,
    ).toISOString();
    expect(await consumeTicket(expired, 'link')).toBeNull();
  });
});
