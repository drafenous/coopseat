import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET as confirm } from '@/app/api/auth/confirm/route';
import { gotrue } from '@/server/gotrue';
import {
  authEmailConfig,
  authEmails,
  SUPPORT_EMAIL,
} from '../supabase/templates/emails.mjs';

const emails = Object.entries(authEmails('https://coopseat.com/'));
const linkEmails = [
  'confirmation',
  'invite',
  'magic_link',
  'recovery',
  'email_change',
];

/** GoTrue renders `<no value>` for variables a template doesn't receive, so each template may only use its own. */
const allowedVars: Record<string, string[]> = {
  confirmation: ['TokenHash'],
  invite: ['TokenHash'],
  magic_link: ['TokenHash'],
  recovery: ['TokenHash'],
  email_change: ['TokenHash', 'NewEmail'],
  reauthentication: ['Token'],
  password_changed: [],
  email_changed: ['OldEmail'],
  mfa_factor_enrolled: ['FactorType'],
  mfa_factor_unenrolled: ['FactorType'],
  identity_linked: ['Provider'],
  identity_unlinked: ['Provider'],
};

describe('auth e-mail templates', () => {
  afterEach(() => vi.restoreAllMocks());

  it('covers every e-mail the app can trigger', () => {
    expect(emails.map(([name]) => name).sort()).toEqual(
      Object.keys(allowedVars).sort(),
    );
  });

  it.each(emails)('%s shares the bilingual layout', (_, email) => {
    expect(email.subject).toMatch(/ \/ /);
    expect(email.html).toContain('<meta charset="utf-8">');
    expect(email.html).toContain('<div lang="pt-BR">');
    expect(email.html).toContain(SUPPORT_EMAIL);
    expect(email.html).toContain('href="https://coopseat.com"');
    expect(email.html).not.toMatch(/undefined|\[object Object\]/);
  });

  it.each(emails)(
    '%s only uses variables GoTrue provides for it',
    (name, email) => {
      const used = [
        ...`${email.subject}${email.html}`.matchAll(
          /\{\{\s*(?:if\s+)?\.(\w+)\s*\}\}/g,
        ),
      ].map((m) => m[1]);
      const allowed = new Set(['SiteURL', 'Email', ...allowedVars[name]!]);
      expect(used.filter((v) => !allowed.has(v!))).toEqual([]);
      const opens = email.html.match(/\{\{ if /g)?.length ?? 0;
      expect(email.html.match(/\{\{ end \}\}/g)?.length ?? 0).toBe(opens);
    },
  );

  it.each(linkEmails)(
    '%s links to a type the confirm route accepts',
    async (name) => {
      const html = Object.fromEntries(emails)[name]!.html;
      const href = html.match(
        /href="(\{\{ \.SiteURL \}\}\/api\/auth\/confirm\?[^"]+)"/,
      )?.[1];
      expect(href).toBeDefined();
      const url = href!
        .replace('{{ .SiteURL }}', 'https://coopseat.com')
        .replace('{{ .TokenHash }}', 'hash');
      const verify = vi
        .spyOn(gotrue, 'verifyOtp')
        .mockResolvedValue({} as never);
      const res = await confirm(new NextRequest(url));
      expect(verify).toHaveBeenCalledWith(
        new URL(url).searchParams.get('type'),
        'hash',
      );
      expect(res.headers.get('location')).not.toContain('error=');
    },
  );

  it('switches on every security notification it templates', () => {
    const config = authEmailConfig('https://coopseat.com');
    for (const [name, email] of emails) {
      if (email.kind === 'notification') {
        expect(config[`mailer_notifications_${name}_enabled`]).toBe(true);
        expect(config[`mailer_templates_${name}_notification_content`]).toBe(
          email.html,
        );
      } else {
        expect(config[`mailer_templates_${name}_content`]).toBe(email.html);
      }
    }
  });
});
