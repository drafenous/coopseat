import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '@/server/email';
import { ApiError } from '@/server/http';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('posts to Resend from no-reply@coopseat.com', async () => {
    const fetchSpy = vi.fn(async () => Response.json({ id: 'email-1' }));
    vi.stubGlobal('fetch', fetchSpy);
    const id = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: '<p>Hi</p>', idempotencyKey: 'k1' });
    expect(id).toBe('email-1');
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test');
    expect(headers['Idempotency-Key']).toBe('k1');
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: 'CoopSeat <no-reply@coopseat.com>',
      to: 'a@b.com',
      subject: 'Hi',
    });
  });

  it('hides upstream failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const err = await sendEmail({ to: 'a@b.com', subject: 'Hi', html: 'x' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('email_unavailable');
  });
});
