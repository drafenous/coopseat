'use client';

import { useState, type FormEvent } from 'react';
import { Turnstile } from '@/components/Turnstile';
import { Alert, Button, Field } from '@/components/ui';
import { useT } from '@/i18n/client';
import { api, ApiClientError } from '@/lib/client/api';

export function ForgotForm() {
  const t = useT();
  const [captcha, setCaptcha] = useState<string>();
  const [captchaReset, setCaptchaReset] = useState(0);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    setPending(true);
    setError(undefined);
    try {
      const res = await api<{ message: string }>('/api/auth/password/forgot', {
        body: { email, captchaToken: captcha },
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t.forgot.failed);
      setCaptchaReset((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  if (message) return <Alert tone="success">{message}</Alert>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <Field
        label={t.forgot.accountEmail}
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
      <Button type="submit" disabled={pending}>
        {pending ? t.forgot.pending : t.forgot.submit}
      </Button>
    </form>
  );
}
