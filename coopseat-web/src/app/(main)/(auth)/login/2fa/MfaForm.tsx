'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { useT } from '@/i18n/client';
import { api, ApiClientError } from '@/lib/client/api';

export function MfaForm({ next }: { next: string }) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [recovery, setRecovery] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '').trim();
    setPending(true);
    setError(undefined);
    try {
      await api('/api/auth/mfa/challenge', { body: { code } });
      router.push(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'mfa_expired') {
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : t.mfa.invalid);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted">
        {recovery ? t.mfa.securityHint : t.mfa.subtitle}
      </p>
      <Field
        label={recovery ? t.mfa.securityCode : t.common.code}
        name="code"
        inputMode={recovery ? 'text' : 'numeric'}
        autoComplete={recovery ? 'off' : 'one-time-code'}
        pattern={recovery ? undefined : '\\d{6}'}
        maxLength={recovery ? 40 : 6}
        required
        autoFocus
        key={recovery ? 'security' : 'totp'}
      />
      <Button type="submit" disabled={pending}>
        {pending ? t.mfa.pending : t.mfa.submit}
      </Button>
      <button
        type="button"
        className="text-sm text-accent hover:underline"
        onClick={() => setRecovery((value) => !value)}
      >
        {recovery ? t.mfa.useApp : t.mfa.useSecurityCode}
      </button>
    </form>
  );
}
