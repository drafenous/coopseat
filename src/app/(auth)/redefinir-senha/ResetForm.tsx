'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { api, ApiClientError } from '@/lib/client/api';

export function ResetForm() {
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get('password') !== form.get('confirm')) {
      setError('As senhas não conferem.');
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await api('/api/auth/password/reset', { body: { password: form.get('password') } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Não foi possível salvar a senha.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <Alert tone="success">
        Senha atualizada. <Link href="/conta" className="underline">Ir para minha conta</Link> ou volte ao app e entre com a nova senha.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <Field label="Nova senha" name="password" type="password" autoComplete="new-password" minLength={8} required hint="Mínimo de 8 caracteres, com letras e números." />
      <Field label="Confirme a senha" name="confirm" type="password" autoComplete="new-password" required />
      <Button type="submit" disabled={pending}>{pending ? 'Salvando…' : 'Salvar senha'}</Button>
    </form>
  );
}
