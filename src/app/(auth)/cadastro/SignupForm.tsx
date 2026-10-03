'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { NicknameField } from '@/components/NicknameField';
import { Turnstile } from '@/components/Turnstile';
import { Alert, Button, Field } from '@/components/ui';
import { api, ApiClientError } from '@/lib/client/api';

export function SignupForm() {
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
          confirmAdult: form.get('confirmAdult') === 'on',
          captchaToken: captcha,
        },
      });
      setSentTo(String(form.get('email')));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFields(err.fields ?? (err.code === 'nickname_taken' ? { nickname: [err.message] } : {}));
      } else {
        setError('Não foi possível criar a conta.');
      }
      setCaptchaReset((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <Alert tone="success">
        Quase lá! Enviamos um link de confirmação para <strong>{sentTo}</strong>. Abra o e-mail para ativar a conta.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert>{error}</Alert> : null}
      <NicknameField value={nickname} onChange={setNickname} error={fields['nickname']?.[0]} />
      <Field label="E-mail" name="email" type="email" autoComplete="email" required error={fields['email']?.[0]} />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        error={fields['password']?.[0]}
        hint="Mínimo de 8 caracteres, com letras e números."
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmAdult" className="mt-1" required />
        <span>Tenho 18 anos ou mais. Vou verificar minha idade para usar chat, voz e criar salas.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="acceptTerms" className="mt-1" required />
        <span>
          Li e aceito os <Link href="/termos" className="text-accent" target="_blank">Termos de Uso</Link> e a{' '}
          <Link href="/privacidade" className="text-accent" target="_blank">Política de Privacidade</Link>.
        </span>
      </label>
      <Turnstile onToken={setCaptcha} resetKey={captchaReset} />
      <Button type="submit" disabled={pending}>{pending ? 'Criando…' : 'Criar conta'}</Button>
    </form>
  );
}
