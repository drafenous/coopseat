'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Turnstile } from '@/components/Turnstile';
import { Alert, Button, Field } from '@/components/ui';
import { useT } from '@/i18n/client';
import { trackEvent } from '@/lib/analytics';
import { api, ApiClientError } from '@/lib/client/api';

export function LoginForm({ next }: { next: string }) {
  const t = useT();
  const router = useRouter();
  const [captcha, setCaptcha] = useState<string>();
  const [captchaReset, setCaptchaReset] = useState(0);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    try {
      const res = await api<{ mfaRequired?: boolean }>('/api/auth/login', {
        body: { email: form.get('email'), password: form.get('password'), captchaToken: captcha },
      });
      trackEvent({ name: 'login', method: 'email' });
      router.push(res.mfaRequired ? `/login/2fa?next=${encodeURIComponent(next)}` : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t.login.failed);
      setCaptchaReset((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <Field label={t.common.email} name="email" type="email" autoComplete="email" required />
      <Field label={t.common.password} name="password" type="password" autoComplete="current-password" required />
      <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
      <Button type="submit" disabled={pending}>{pending ? t.login.pending : t.login.submit}</Button>
    </form>
  );
}
