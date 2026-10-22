import { NextResponse } from 'next/server';
import { dictionaryFor, localeFromRequest } from '@/i18n/server';
import { parseEvidence, reportSchema } from '@/lib/validation/inbound';
import { verifyCaptcha } from '@/server/captcha';
import { ApiError, clientIp, readJson, route } from '@/server/http';
import { getProfile } from '@/server/profiles';
import { rateLimit } from '@/server/rate-limit';
import { sendEmail } from '@/server/email';
import { assertSameOrigin, getAuth } from '@/server/session';
import { HELP_INBOX, renderMail } from '@/server/support-mail';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit('report', ip);
  const input = await readJson(req, reportSchema);
  if (input.website?.trim()) {
    return NextResponse.json({
      message: dictionaryFor(req).messages.reportSent,
    });
  }

  // A desktop header or an unverified Bearer prefix skips the origin check
  // and is not a session. Those requests pass Turnstile, the same gate as
  // POST /api/contact. A verified session may skip it: the desktop shell
  // cannot run the widget, and getAuth is what checks the bearer token.
  const auth = await getAuth(req);
  if (!auth) await verifyCaptcha(input.captchaToken, ip);

  const images = (input.images ?? []).map((data, index) => {
    const parsed = parseEvidence(data, index);
    if (typeof parsed === 'string') throw new ApiError(400, parsed);
    return parsed;
  });
  let account = '';
  if (auth) {
    const profile = await getProfile(auth.claims.sub).catch((err: unknown) => {
      console.error(
        'report profile lookup failed',
        err instanceof Error ? err.message : err,
      );
      return null;
    });
    account = [auth.claims.sub, profile?.nickname, auth.claims.email]
      .filter((part): part is string => Boolean(part))
      .join(' · ');
  }
  const version = (req.headers.get('x-coopseat-version') ?? '')
    .replace(/[\r\n\0]/g, '')
    .trim()
    .slice(0, 32);

  const rows: [string, string][] = [
    ['Category', input.category],
    ['Email', input.email],
    ['Surface', input.surface],
    ['Language', localeFromRequest(req)],
  ];
  if (input.room) rows.push(['Room', input.room]);
  if (account) rows.push(['Account', account]);
  if (version) rows.push(['Version', version]);
  rows.push(['Message', input.message], ['Images', String(images.length)]);

  await sendEmail({
    to: HELP_INBOX,
    subject: `Report (${input.category})`,
    replyTo: input.email,
    attachments: images,
    ...renderMail(rows),
  });
  return NextResponse.json({
    message: dictionaryFor(req).messages.reportSent,
  });
});
