import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as webhook } from '@/app/api/identity/webhooks/[provider]/route';
import {
  ageOf,
  canonicalJson,
  diditProvider,
  signDiditPayload,
} from '@/server/identity/providers/didit';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
}));

const SECRET = 'didit-webhook-secret';
const now = () => String(Math.floor(Date.now() / 1000));

function event(
  status: string,
  idVerification: Record<string, unknown> | null = {
    age: 30,
    document_number: 'AB123',
    issuing_state: 'BRA',
  },
) {
  return {
    event_id: '9c0c8b8a-1111-4222-9333-444444444444',
    webhook_type: 'status.updated',
    session_id: 's1',
    status,
    vendor_data: 'p1',
    ...(idVerification && {
      decision: {
        id_verifications: [
          { status, document_type: 'Identity Card', ...idVerification },
        ],
      },
    }),
  };
}

function signed(body: unknown, overrides: Record<string, string> = {}) {
  return new Headers({
    'x-timestamp': now(),
    'x-signature-v2': signDiditPayload(body, SECRET),
    ...overrides,
  });
}

beforeEach(() => {
  vi.stubEnv('DIDIT_API_KEY', 'didit-api-key');
  vi.stubEnv('DIDIT_WORKFLOW_ID', 'workflow-1');
  vi.stubEnv('DIDIT_WEBHOOK_SECRET', SECRET);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('canonicalJson', () => {
  it('sorts keys recursively, keeps Unicode and does not reorder integer-like keys', () => {
    expect(
      canonicalJson({ b: [{ z: 1, a: 'José' }], a: null, '10': 1, '2': 2 }),
    ).toBe('{"10":1,"2":2,"a":null,"b":[{"a":"José","z":1}]}');
  });
});

describe('ageOf', () => {
  const now = new Date('2026-10-03T12:00:00Z');
  it('prefers the age field and falls back to the birth date', () => {
    expect(ageOf({ age: 30, date_of_birth: '2015-01-01' }, now)).toBe(30);
    expect(ageOf({ date_of_birth: '2008-10-03' }, now)).toBe(18);
    expect(ageOf({ date_of_birth: '2008-10-04' }, now)).toBe(17);
    expect(ageOf({ date_of_birth: 'garbage' }, now)).toBeNull();
    expect(ageOf(undefined, now)).toBeNull();
  });
});

describe('diditProvider.createSession', () => {
  it('creates a hosted session tied to the profile and returns its URL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      Response.json({
        session_id: 'sess-1',
        url: 'https://verify.didit.me/session/abc',
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);

    const session = await diditProvider.createSession({
      profileId: 'p1',
      returnUrl: 'https://coopseat.com/account?verified=1',
      callbackUrl: 'unused',
    });
    expect(session).toEqual({
      sessionId: 'sess-1',
      url: 'https://verify.didit.me/session/abc',
    });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('https://verification.didit.me/v3/session/');
    expect(init.headers['x-api-key']).toBe('didit-api-key');
    expect(JSON.parse(init.body)).toEqual({
      workflow_id: 'workflow-1',
      vendor_data: 'p1',
      callback: 'https://coopseat.com/account?verified=1',
    });
  });

  it('reports the provider as unavailable on API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 500 })),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      diditProvider.createSession({
        profileId: 'p1',
        returnUrl: 'x',
        callbackUrl: 'y',
      }),
    ).rejects.toMatchObject({
      status: 502,
      code: 'kyc_unavailable',
    });
  });
});

describe('diditProvider.parseWebhook', () => {
  it('maps an approved adult with the document used for the fingerprint', async () => {
    const body = event('Approved');
    expect(
      await diditProvider.parseWebhook(JSON.stringify(body), signed(body)),
    ).toEqual({
      sessionId: 's1',
      status: 'approved',
      isAdult: true,
      document: { country: 'BRA', number: 'AB123' },
      failureReason: undefined,
    });
  });

  it('flags minors and maps declined, review and abandoned sessions', async () => {
    const minor = event('Approved', {
      age: 16,
      document_number: 'X1',
      issuing_state: 'BRA',
    });
    expect(
      await diditProvider.parseWebhook(JSON.stringify(minor), signed(minor)),
    ).toMatchObject({ status: 'approved', isAdult: false });

    const declined = event('Declined');
    expect(
      await diditProvider.parseWebhook(
        JSON.stringify(declined),
        signed(declined),
      ),
    ).toMatchObject({ status: 'rejected', failureReason: 'declined' });

    const review = event('In Review', null);
    expect(
      await diditProvider.parseWebhook(JSON.stringify(review), signed(review)),
    ).toMatchObject({ status: 'review', isAdult: null, document: null });

    const abandoned = event('Abandoned', null);
    expect(
      await diditProvider.parseWebhook(
        JSON.stringify(abandoned),
        signed(abandoned),
      ),
    ).toMatchObject({ status: 'rejected', failureReason: 'abandoned' });
  });

  it('ignores progress updates and other event types', async () => {
    for (const body of [
      event('In Progress', null),
      event('Not Started', null),
      { ...event('Approved'), webhook_type: 'data.updated' },
    ]) {
      expect(
        await diditProvider.parseWebhook(JSON.stringify(body), signed(body)),
      ).toBeNull();
    }
  });

  it('rejects forged, tampered and stale requests', async () => {
    const body = event('Approved');
    const raw = JSON.stringify(body);
    await expect(
      diditProvider.parseWebhook(
        raw,
        signed(body, { 'x-signature-v2': 'forged' }),
      ),
    ).rejects.toThrow('bad signature');
    await expect(
      diditProvider.parseWebhook(
        JSON.stringify({ ...body, status: 'Declined' }),
        signed(body),
      ),
    ).rejects.toThrow('bad signature');
    const stale = String(Math.floor(Date.now() / 1000) - 600);
    await expect(
      diditProvider.parseWebhook(raw, signed(body, { 'x-timestamp': stale })),
    ).rejects.toThrow('timestamp');
    await expect(
      diditProvider.parseWebhook(
        raw,
        new Headers({ 'x-signature-v2': signDiditPayload(body, SECRET) }),
      ),
    ).rejects.toThrow('timestamp');
  });
});

describe('POST /api/identity/webhooks/didit', () => {
  const params = { params: Promise.resolve({ provider: 'didit' }) };
  const post = (body: unknown, headers: Headers) =>
    webhook(
      new NextRequest('https://coopseat.com/api/identity/webhooks/didit', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      }),
      params,
    );

  beforeEach(() => {
    fake.current = createFakeDb();
    fake.current.data.Profile.push({ id: 'p1', ageStatus: 'PENDING' });
    fake.current.data.IdentityVerification.push({
      id: 'v1',
      profileId: 'p1',
      provider: 'didit',
      providerSessionId: 's1',
      status: 'created',
      completedAt: null,
    });
  });

  it('verifies the profile on a signed approval', async () => {
    const body = event('Approved');
    const res = await post(body, signed(body));
    expect(await res.json()).toMatchObject({
      applied: true,
      status: 'approved',
    });
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('VERIFIED');
  });

  it('acknowledges progress updates without touching the profile', async () => {
    const body = event('In Progress', null);
    const res = await post(body, signed(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ applied: false, reason: 'ignored' });
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('PENDING');
  });

  it('refuses an invalid signature', async () => {
    const body = event('Approved');
    const res = await post(body, signed(body, { 'x-signature-v2': 'forged' }));
    expect(res.status).toBe(401);
    expect(fake.current.data.Profile[0]!.ageStatus).toBe('PENDING');
  });
});
