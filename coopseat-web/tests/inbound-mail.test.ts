import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as contact } from '@/app/api/contact/route';
import { POST as report } from '@/app/api/report/route';
import { sendEmail } from '@/server/email';
import { createFakeDb, type FakeDb } from './fake-db';

const fake = vi.hoisted(() => ({ current: null as unknown as FakeDb }));
vi.mock('@/prisma/db', () => ({
  adminDb: async () => fake.current.db,
  getDb: async () => fake.current.db,
  tryLockedRateLimit: async () => 'unsupported' as const,
}));
vi.mock('@/server/email', () => ({
  sendEmail: vi.fn(async () => 'email-1'),
}));

const ctx = undefined as never;
const web = { origin: 'https://coopseat.com' };
const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function request(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(`https://coopseat.com${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const contactBody = {
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Hello <script>',
};

const reportBody = {
  category: 'abuse',
  email: 'ada@example.com',
  message: 'They spammed the chat',
  surface: 'play',
  room: 'luna',
  images: [PNG],
};

beforeEach(() => {
  fake.current = createFakeDb();
  vi.mocked(sendEmail).mockClear();
  vi.mocked(sendEmail).mockResolvedValue('email-1');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/contact', () => {
  it('mails contact@ with the sender as reply-to', async () => {
    const res = await contact(request('/api/contact', contactBody, web), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      message: 'Message sent. We will reply to the e-mail you entered.',
    });
    expect(sendEmail).toHaveBeenCalledOnce();
    const message = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(message).toMatchObject({
      to: 'contact@coopseat.com',
      replyTo: 'ada@example.com',
      subject: 'Contact from Ada',
    });
    expect(message.attachments).toBeUndefined();
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).not.toContain('<script>');
  });

  it('rejects an empty message', async () => {
    const res = await contact(
      request('/api/contact', { ...contactBody, message: '  ' }, web),
      ctx,
    );
    expect(res.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('stops after 5 messages from the same IP', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await contact(request('/api/contact', contactBody, web), ctx);
      expect(res.status).toBe(200);
    }
    const blocked = await contact(
      request('/api/contact', contactBody, web),
      ctx,
    );
    expect(blocked.status).toBe(429);
    expect(sendEmail).toHaveBeenCalledTimes(5);
  });
});

describe('POST /api/report', () => {
  it('mails help@ with the image attached', async () => {
    const res = await report(
      request('/api/report', reportBody, {
        ...web,
        'x-coopseat-version': '1.2.3',
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const message = vi.mocked(sendEmail).mock.calls[0]![0];
    expect(message).toMatchObject({
      to: 'help@coopseat.com',
      replyTo: 'ada@example.com',
      subject: 'Report (abuse)',
      attachments: [
        {
          filename: 'evidence-1.png',
          content: PNG,
          contentType: 'image/png',
        },
      ],
    });
    expect(message.text).toContain('Room: luna');
    expect(message.text).toContain('Images: 1');
    expect(message.text).toContain('Version: 1.2.3');
  });

  it('accepts a desktop report without an Origin header', async () => {
    const res = await report(
      request(
        '/api/report',
        { ...reportBody, images: [] },
        {
          'x-coopseat-client': 'desktop',
        },
      ),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(sendEmail).mock.calls[0]![0].attachments).toEqual([]);
  });

  it('does not send when the honeypot is filled', async () => {
    const res = await report(
      request(
        '/api/report',
        { ...reportBody, website: 'https://spam.test' },
        web,
      ),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('rejects a fourth image, a non-image and an oversized file', async () => {
    const fourth = await report(
      request(
        '/api/report',
        { ...reportBody, images: [PNG, PNG, PNG, PNG] },
        web,
      ),
      ctx,
    );
    expect(fourth.status).toBe(400);
    expect((await fourth.json()).error.message).toContain('3');

    const fakeImage = await report(
      request(
        '/api/report',
        { ...reportBody, images: [Buffer.from('hello').toString('base64')] },
        { ...web, 'x-forwarded-for': '203.0.113.11' },
      ),
      ctx,
    );
    expect(fakeImage.status).toBe(400);
    expect((await fakeImage.json()).error.message).toMatch(/JPEG|PNG|WebP/);

    const oversized = Buffer.alloc(1024 * 1024 + 1).toString('base64');
    const tooBig = await report(
      request(
        '/api/report',
        { ...reportBody, images: [oversized] },
        { ...web, 'x-forwarded-for': '203.0.113.12' },
      ),
      ctx,
    );
    expect(tooBig.status).toBe(400);
    expect((await tooBig.json()).error.message).toContain('1 MB');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('stops after 5 reports from the same IP', async () => {
    const headers = { ...web, 'x-forwarded-for': '203.0.113.20' };
    for (let i = 0; i < 5; i++) {
      const res = await report(
        request('/api/report', { ...reportBody, images: [] }, headers),
        ctx,
      );
      expect(res.status).toBe(200);
    }
    const blocked = await report(
      request('/api/report', { ...reportBody, images: [] }, headers),
      ctx,
    );
    expect(blocked.status).toBe(429);
    expect(sendEmail).toHaveBeenCalledTimes(5);
  });
});
