'use client';

import { useEffect, useState } from 'react';
import { Field } from '@/components/ui';
import { nicknameSchema } from '@/lib/validation/account';

type Remote = { value: string; available: boolean; reason?: string };

/** Nickname input with live format + availability feedback from /api/nicknames/available. */
export function NicknameField({
  value,
  onChange,
  error,
  current,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  current?: string | null;
}) {
  const [remote, setRemote] = useState<Remote>();
  const parsed = nicknameSchema.safeParse(value);
  const shouldCheck = Boolean(value) && value !== current && parsed.success;
  const candidate = parsed.success ? parsed.data : '';

  useEffect(() => {
    if (!shouldCheck) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/nicknames/available?n=${encodeURIComponent(candidate)}`, { signal: controller.signal });
        const data = (await res.json()) as { available?: boolean; reason?: string };
        setRemote({ value: candidate, available: Boolean(data.available), reason: data.reason });
      } catch {
        // Aborted or offline: keep the previous hint.
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [shouldCheck, candidate]);

  let formatError: string | undefined;
  let hint: React.ReactNode = '3 a 20 caracteres: letras, números ou _.';
  if (value && value !== current) {
    if (!parsed.success) {
      formatError = parsed.error.issues[0]?.message;
    } else if (remote?.value !== candidate) {
      hint = 'Verificando…';
    } else if (remote.available) {
      hint = <span className="text-emerald-400">Disponível!</span>;
    } else {
      formatError = remote.reason ?? 'Indisponível.';
    }
  }

  return (
    <Field
      label="Apelido"
      name="nickname"
      autoComplete="username"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={20}
      required
      error={error ?? formatError}
      hint={hint}
    />
  );
}
