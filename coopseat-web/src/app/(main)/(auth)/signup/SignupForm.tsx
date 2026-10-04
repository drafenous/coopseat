'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { NicknameField } from '@/components/NicknameField';
import { Turnstile } from '@/components/Turnstile';
import { Alert, Button, Field } from '@/components/ui';
import { useT } from '@/i18n/client';
import { trackEvent } from '@/lib/analytics';
import { api, ApiClientError } from '@/lib/client/api';

export function SignupForm() {
  const t = useT();
  const [nickname, setNickname] = useState('');
  const [captcha, setCaptcha] = useState<string>();
  const [captchaReset, setCaptchaReset] = useState(0);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    setFields({});
    try {
      await api('/api/auth/signup', {
        body: {
          email: form.get('email'),
          password: form.get('password'),
          nickname,
          acceptTerms: form.get('acceptTerms') === 'on',
          confirmMinAge: form.get('confirmMinAge') === 'on',
          captchaToken: captcha,
        },
      });
      trackEvent({ name: 'sign_up', method: 'email' });
      setSentTo(String(form.get('email')));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields ?? (err.code === 'nickname_taken' ? { nickname: [err.message] } : {}));
      } else {
        setError(t.signup.failed);
      }
      setCaptchaReset((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return <Alert tone="success">{t.signup.sent(sentTo)}</Alert>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <NicknameField value={nickname} onChange={setNickname} error={fields['nickname']?.[0]} />
      <Field label={t.common.email} name="email" type="email" autoComplete="email" required error={fields['email']?.[0]} />
      <Field
        label={t.common.password}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        error={fields['password']?.[0]}
        hint={t.common.passwordHint}
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmMinAge" className="mt-1" required />
        <span>{t.signup.confirmMinAge}</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acceptTerms" className="mt-1" required />
        <span>
          {t.signup.acceptTerms(
            <Link href="/terms" className="text-accent" target="_blank">{t.common.termsOfUse}</Link>,
            <Link href="/privacy" className="text-accent" target="_blank">{t.common.privacyPolicy}</Link>,
          )}
        </span>
      </label>
      <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
      <Button type="submit" disabled={pending}>{pending ? t.signup.pending : t.signup.submit}</Button>
    </form>
  );
}
