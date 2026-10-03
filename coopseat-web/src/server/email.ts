import { env } from './env';
import { ApiError } from './http';

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  /** Resend drops repeated sends with the same key for 24 h. */
  idempotencyKey?: string;
};

/** Sends a transactional e-mail through Resend from `no-reply@coopseat.com`. Returns the Resend id. */
export async function sendEmail(message: EmailMessage): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.resendApiKey}`,
    'Content-Type': 'application/json',
  };
  if (message.idempotencyKey) headers['Idempotency-Key'] = message.idempotencyKey;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: env.emailFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      reply_to: message.replyTo,
      tags: message.tags,
    }),
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    throw new ApiError(502, 'email_unavailable');
  }
  const { id } = (await res.json()) as { id: string };
  return id;
}
