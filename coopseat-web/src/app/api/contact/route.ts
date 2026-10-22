import { NextResponse } from 'next/server';
import { dictionaryFor, localeFromRequest } from '@/i18n/server';
import { contactSchema } from '@/lib/validation/inbound';
import { verifyCaptcha } from '@/server/captcha';
import { clientIp, readJson, route } from '@/server/http';
import { rateLimit } from '@/server/rate-limit';
import { sendEmail } from '@/server/email';
import { assertSameOrigin } from '@/server/session';
import { CONTACT_INBOX, renderMail, subjectName } from '@/server/support-mail';

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  await rateLimit('contact', ip);
  const input = await readJson(req, contactSchema);
  await verifyCaptcha(input.captchaToken, ip);

  const name = subjectName(input.name);
  const body = renderMail([
    ['Name', name],
    ['Email', input.email],
    ['Language', localeFromRequest(req)],
    ['Message', input.message],
  ]);
  await sendEmail({
    to: CONTACT_INBOX,
    subject: `Contact from ${name}`,
    replyTo: input.email,
    ...body,
  });
  return NextResponse.json({
    message: dictionaryFor(req).messages.contactSent,
  });
});
