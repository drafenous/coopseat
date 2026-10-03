'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { useT } from '@/i18n/client';
import { api, ApiClientError } from '@/lib/client/api';

export function ResetForm() {
  const t = useT();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get('password') !== form.get('confirm')) {
      setError(t.reset.mismatch);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await api('/api/auth/password/reset', { body: { password: form.get('password') } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t.reset.failed);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success">
        {t.reset.done((label) => <Link href="/account" className="underline">{label}</Link>)}
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <Field label={t.common.newPassword} name="password" type="password" autoComplete="new-password" minLength={8} required hint={t.common.passwordHint} />
      <Field label={t.common.confirmPassword} name="confirm" type="password" autoComplete="new-password" required />
      <Button type="submit" disabled={pending}>{pending ? t.reset.pending : t.reset.submit}</Button>
    </form>
  );
}
