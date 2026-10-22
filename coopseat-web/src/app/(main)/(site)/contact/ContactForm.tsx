'use client';

import { useState, type FormEvent } from 'react';
import { Turnstile } from '@/components/Turnstile';
import { Alert, Button, Field } from '@/components/ui';
import { useT } from '@/i18n/client';
import { api, ApiClientError } from '@/lib/client/api';

export function ContactForm() {
  const t = useT();
  const [captcha, setCaptcha] = useState<string>();
  const [captchaReset, setCaptchaReset] = useState(0);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const res = await api<{ message: string }>('/api/contact', {
        body: {
          name: data.get('name'),
          email: data.get('email'),
          message: data.get('message'),
          captchaToken: captcha,
        },
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t.contact.failed);
      setCaptchaReset((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  if (message) return <Alert tone="success">{message}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <Field label={t.contact.name} name="name" autoComplete="name" required />
      <Field
        label={t.contact.email}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <label className="flex flex-col gap-[7px] text-[13px] text-[#a5b4c3]">
        {t.contact.message}
        <textarea
          name="message"
          required
          rows={6}
          maxLength={4000}
          className="w-full resize-y rounded-[7px] border border-[#304050] bg-field px-2.5 py-2 text-[13px] text-field-text placeholder:text-subtle hover:border-[#3d5163] aria-invalid:border-danger"
        />
      </label>
      <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
      <Button type="submit" disabled={pending}>
        {pending ? t.contact.pending : t.contact.submit}
      </Button>
    </form>
  );
}
