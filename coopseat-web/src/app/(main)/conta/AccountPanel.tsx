'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { NicknameField } from '@/components/NicknameField';
import { Alert, Button, Field } from '@/components/ui';
import { api, ApiClientError } from '@/lib/client/api';
import { OAUTH_PROVIDERS, PROVIDER_LABELS, type OAuthProvider } from '@/lib/validation/account';
import type { AccountSummary } from '@/server/account';
import { GATE_MESSAGES } from '@/lib/gates';

const AGE_LABELS: Record<AccountSummary['ageStatus'], string> = {
  UNVERIFIED: 'Não verificada',
  PENDING: 'Em análise',
  VERIFIED: 'Verificada (18+)',
  REJECTED: 'Recusada',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-white/5">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function message(err: unknown): string {
  return err instanceof ApiClientError ? err.message : 'Algo deu errado. Tente novamente.';
}

export function AccountPanel({ initial, notice }: { initial: AccountSummary; notice?: string }) {
  const router = useRouter();
  const [account, setAccount] = useState(initial);
  const [flash, setFlash] = useState<{ tone: 'success' | 'error'; text: string } | undefined>(
    notice ? { tone: 'success', text: notice } : undefined,
  );
  const [busy, setBusy] = useState<string>();

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setFlash(undefined);
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'mfa_required') {
        router.push('/entrar/2fa?next=/conta');
        return;
      }
      setFlash({ tone: 'error', text: message(err) });
    } finally {
      setBusy(undefined);
    }
  }

  async function reload() {
    setAccount(await api<AccountSummary>('/api/me'));
  }

  return (
    <div className="space-y-6">
      {flash ? <Alert tone={flash.tone}>{flash.text}</Alert> : null}
      {!account.nickname ? (
        <NicknameSetup
          needsTerms={!account.termsVersion}
          onDone={(next) => {
            setAccount(next);
            setFlash({ tone: 'success', text: 'Apelido salvo. Bem-vindo ao CoopSeat!' });
          }}
        />
      ) : (
        <ProfileSection account={account} busy={busy} run={run} setAccount={setAccount} setFlash={setFlash} />
      )}

      {account.needsEmail || account.pendingEmail ? (
        <EmailSection account={account} busy={busy} run={run} setFlash={setFlash} />
      ) : null}

      <Section title="Verificação de idade">
        <p className="text-sm">
          Status: <strong>{AGE_LABELS[account.ageStatus]}</strong>
        </p>
        <p className="text-sm text-muted">
          Exigida por lei (ECA Digital) para chat, voz e criar salas. Guardamos apenas o resultado (maior de idade) e a data,
          nunca fotos ou dados do documento.
        </p>
        {account.ageStatus !== 'VERIFIED' && account.ageStatus !== 'PENDING' ? (
          <Button
            disabled={busy === 'kyc' || !account.emailConfirmed || !account.nickname}
            onClick={() =>
              run('kyc', async () => {
                const { url } = await api<{ url: string }>('/api/identity/sessions', { method: 'POST', body: {} });
                window.location.href = url;
              })
            }
          >
            Verificar minha idade
          </Button>
        ) : null}
      </Section>

      <Section title="Contas vinculadas">
        <ul className="space-y-2">
          {account.identities.map((identity) => (
            <li key={identity.id} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {identity.provider === 'email' ? 'E-mail e senha' : (PROVIDER_LABELS[identity.provider as OAuthProvider] ?? identity.provider)}
                {identity.email ? <span className="text-muted"> · {identity.email}</span> : null}
              </span>
              {account.identities.length > 1 ? (
                <button
                  className="text-xs text-red-300 hover:underline disabled:opacity-50"
                  disabled={busy === `unlink:${identity.id}`}
                  onClick={() =>
                    run(`unlink:${identity.id}`, async () => {
                      await api(`/api/auth/identities/${identity.id}`, { method: 'DELETE' });
                      await reload();
                      setFlash({ tone: 'success', text: 'Vínculo removido.' });
                    })
                  }
                >
                  Desvincular
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2">
          {OAUTH_PROVIDERS.filter((p) => !account.identities.some((i) => i.provider === p)).map((provider) => (
            <Button
              key={provider}
              variant="secondary"
              disabled={busy === `link:${provider}`}
              onClick={() =>
                run(`link:${provider}`, async () => {
                  const { url } = await api<{ url: string }>('/api/auth/link/start', { body: { provider } });
                  window.location.href = url;
                })
              }
            >
              Vincular {PROVIDER_LABELS[provider]}
            </Button>
          ))}
        </div>
      </Section>

      <SecuritySection account={account} busy={busy} run={run} reload={reload} setFlash={setFlash} />

      <Section title="Permissões na watch-party">
        <ul className="space-y-1 text-sm">
          {(['watch', 'chat', 'voice', 'host'] as const).map((key) => {
            const gate = account.permissions[key];
            const label = { watch: 'Assistir', chat: 'Chat', voice: 'Voz', host: 'Criar salas' }[key];
            return (
              <li key={key}>
                {gate.allowed ? '✅' : '🔒'} {label}
                {!gate.allowed ? <span className="text-muted"> — {gate.missing.map((m) => GATE_MESSAGES[m]).join(' ')}</span> : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Sessão">
        <Button
          variant="secondary"
          onClick={() =>
            run('logout', async () => {
              await api('/api/auth/logout', { method: 'POST', body: {} });
              router.push('/');
              router.refresh();
            })
          }
        >
          Sair
        </Button>
        <DeleteAccount account={account} run={run} busy={busy} />
      </Section>
    </div>
  );
}

type SectionProps = {
  account: AccountSummary;
  busy?: string;
  run: (key: string, fn: () => Promise<void>) => Promise<void>;
  setFlash: (flash: { tone: 'success' | 'error'; text: string } | undefined) => void;
};

function NicknameSetup({ needsTerms, onDone }: { needsTerms: boolean; onDone: (a: AccountSummary) => void }) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (needsTerms && form.get('acceptTerms') !== 'on') {
      setError('É preciso aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      onDone(await api<AccountSummary>('/api/me', { method: 'PATCH', body: { nickname, ...(needsTerms ? { acceptTerms: true } : {}) } }));
    } catch (err) {
      setError(message(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title="Escolha seu apelido">
      <p className="text-sm text-muted">É assim que seus amigos vão te ver nas salas. Ele é único.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        {error ? <Alert>{error}</Alert> : null}
        <NicknameField value={nickname} onChange={setNickname} />
        {needsTerms ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acceptTerms" className="mt-1" />
            <span>
              Tenho 18 anos ou mais e aceito os <a href="/termos" target="_blank" className="text-accent">Termos</a> e a{' '}
              <a href="/privacidade" target="_blank" className="text-accent">Política de Privacidade</a>.
            </span>
          </label>
        ) : null}
        <Button type="submit" disabled={pending}>Salvar apelido</Button>
      </form>
    </Section>
  );
}

function ProfileSection({
  account,
  busy,
  run,
  setAccount,
  setFlash,
}: SectionProps & { setAccount: (a: AccountSummary) => void }) {
  const [nickname, setNickname] = useState(account.nickname ?? '');
  const [now] = useState(() => Date.now());
  const nextChange = account.nicknameChangedAt ? new Date(Date.parse(account.nicknameChangedAt) + 30 * 86_400_000) : null;
  const locked = nextChange !== null && nextChange.getTime() > now;

  return (
    <Section title="Perfil">
      <NicknameField value={nickname} onChange={setNickname} current={account.nickname} />
      {locked ? <p className="text-xs text-muted">Próxima troca liberada em {nextChange!.toLocaleDateString('pt-BR')}.</p> : null}
      <Button
        disabled={locked || nickname === account.nickname || busy === 'nickname'}
        onClick={() =>
          run('nickname', async () => {
            setAccount(await api<AccountSummary>('/api/me', { method: 'PATCH', body: { nickname } }));
            setFlash({ tone: 'success', text: 'Apelido atualizado.' });
          })
        }
      >
        Salvar apelido
      </Button>
    </Section>
  );
}

function EmailSection({ account, busy, run, setFlash }: SectionProps) {
  const [email, setEmail] = useState('');
  return (
    <Section title={account.needsEmail ? 'Adicione um e-mail' : 'Troca de e-mail pendente'}>
      {account.pendingEmail ? (
        <p className="text-sm">Confirme o link enviado para <strong>{account.pendingEmail}</strong>.</p>
      ) : (
        <p className="text-sm text-muted">Sua conta do X não informou e-mail. Ele é necessário para recuperar a conta e verificar a idade.</p>
      )}
      <Field label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Button
        disabled={!email || busy === 'email'}
        onClick={() =>
          run('email', async () => {
            const res = await api<{ message?: string }>('/api/me', { method: 'PATCH', body: { email } });
            setFlash({ tone: 'success', text: res.message ?? 'Verifique seu e-mail.' });
          })
        }
      >
        Enviar confirmação
      </Button>
    </Section>
  );
}

function SecuritySection({ account, busy, run, reload, setFlash }: SectionProps & { reload: () => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [enroll, setEnroll] = useState<{ factorId: string; qrCode: string; secret: string }>();
  const [code, setCode] = useState('');
  const hasPassword = account.identities.some((i) => i.provider === 'email');

  return (
    <Section title="Segurança">
      <Field
        label={hasPassword ? 'Nova senha' : 'Criar senha (para entrar também com e-mail)'}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint="Mínimo de 8 caracteres, com letras e números."
      />
      <Button
        variant="secondary"
        disabled={!password || busy === 'password'}
        onClick={() =>
          run('password', async () => {
            await api('/api/auth/password/set', { body: { password } });
            setPassword('');
            await reload();
            setFlash({ tone: 'success', text: 'Senha salva.' });
          })
        }
      >
        Salvar senha
      </Button>

      <div className="border-t border-white/5 pt-3">
        <p className="mb-2 text-sm font-medium">Verificação em duas etapas (TOTP)</p>
        {account.mfa.enabled ? (
          <ul className="space-y-2 text-sm">
            {account.mfa.factors.map((factor) => (
              <li key={factor.id} className="flex items-center justify-between">
                <span>✅ {factor.name}</span>
                <button
                  className="text-xs text-red-300 hover:underline"
                  onClick={() =>
                    run(`mfa:${factor.id}`, async () => {
                      await api(`/api/auth/mfa/${factor.id}`, { method: 'DELETE' });
                      await reload();
                      setFlash({ tone: 'success', text: 'Autenticador removido.' });
                    })
                  }
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        ) : enroll ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Escaneie o QR code no seu app autenticador e digite o código gerado.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qrCode} alt="QR code do autenticador" className="h-44 w-44 rounded bg-white p-2" />
            <p className="break-all font-mono text-xs text-muted">{enroll.secret}</p>
            <Field label="Código" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
            <Button
              disabled={code.length !== 6 || busy === 'mfa-verify'}
              onClick={() =>
                run('mfa-verify', async () => {
                  await api('/api/auth/mfa/verify', { body: { factorId: enroll.factorId, code } });
                  setEnroll(undefined);
                  setCode('');
                  await reload();
                  setFlash({ tone: 'success', text: 'Verificação em duas etapas ativada.' });
                })
              }
            >
              Ativar
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            disabled={busy === 'mfa-enroll'}
            onClick={() =>
              run('mfa-enroll', async () => {
                setEnroll(await api('/api/auth/mfa/enroll', { body: {} }));
              })
            }
          >
            Ativar verificação em duas etapas
          </Button>
        )}
      </div>
    </Section>
  );
}

function DeleteAccount({ account, run, busy }: Omit<SectionProps, 'setFlash'>) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Excluir conta
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg bg-red-500/5 p-3 ring-1 ring-red-500/20">
      <p className="text-sm">Isso apaga sua conta e seus dados para sempre. Digite <strong>{account.nickname ?? account.email}</strong> para confirmar.</p>
      <Field label="Confirmação" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Button
        variant="danger"
        disabled={!confirm || busy === 'delete'}
        onClick={() =>
          run('delete', async () => {
            await api('/api/me', { method: 'DELETE', body: { confirm } });
            router.push('/');
            router.refresh();
          })
        }
      >
        Excluir definitivamente
      </Button>
    </div>
  );
}
