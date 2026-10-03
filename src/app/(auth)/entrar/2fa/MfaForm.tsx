'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { api, ApiClientError } from '@/lib/client/api';

export function MfaForm({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '');
    setPending(true);
    setError(undefined);
    try {
      await api('/api/auth/mfa/challenge', { body: { code } });
      router.push(next);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'mfa_expired') {
        router.push(`/entrar?next=${encodeURIComponent(next)}`);
        return;
      }
      setError(err instanceof ApiClientError ? err.message : 'Código inválido.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      <Field label="Código" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required autoFocus />
      <Button type="submit" disabled={pending}>{pending ? 'Verificando…' : 'Confirmar'}</Button>
    </form>
  );
}
