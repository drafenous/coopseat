'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { CircleCheck, Download, Lock, Play } from 'lucide-react';
import { NicknameField } from '@/components/NicknameField';
import { Alert, Button, Field, buttonClass } from '@/components/ui';
import { DOWNLOAD_URL } from '@/lib/links';
import { useLocale, useT } from '@/i18n/client';
import type { Dictionary } from '@/i18n/dictionaries';
import { trackEvent } from '@/lib/analytics';
import { api, ApiClientError } from '@/lib/client/api';
import {
  OAUTH_PROVIDERS,
  PROVIDER_LABELS,
  type OAuthProvider,
} from '@/lib/validation/account';
import type { AccountSummary } from '@/server/account';

type Tab = 'profile' | 'security' | 'account';
const TABS: Tab[] = ['profile', 'security', 'account'];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-6 ring-1 ring-white/5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted">{description}</p>
      ) : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function PlayHero({ account }: { account: AccountSummary }) {
  const t = useT();
  const initial = (account.nickname ?? account.email ?? '?')
    .charAt(0)
    .toUpperCase();
  const [avatarFailed, setAvatarFailed] = useState(false);
  return (
    <section className="relative overflow-hidden rounded-2xl bg-surface p-6 ring-1 ring-accent/20">
      <div
        aria-hidden
        className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        {account.avatarUrl && !avatarFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={account.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setAvatarFailed(true)}
            className="size-14 shrink-0 rounded-full object-cover ring-2 ring-accent/30"
          />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent/15 text-xl font-bold text-accent ring-2 ring-accent/30">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-strong">
            {account.nickname
              ? t.account.greeting(account.nickname)
              : t.account.welcome}
          </h1>
          {account.email ? (
            <p className="truncate text-sm text-muted">{account.email}</p>
          ) : null}
        </div>
      </div>
      <p className="relative mt-5 text-sm text-muted">{t.account.playBody}</p>
      <div className="relative mt-4 flex flex-wrap gap-3">
        <a href="/play" className={buttonClass({ inline: true })}>
          <Play size={16} />
          {t.account.playCta}
        </a>
        <a
          href={DOWNLOAD_URL}
          className={buttonClass({ variant: 'secondary' })}
        >
          <Download size={16} />
          {t.home.download}
        </a>
      </div>
    </section>
  );
}

function PartySection({ account, busy, run }: Omit<SectionProps, 'setFlash'>) {
  const t = useT();
  const gates = (['watch', 'chat', 'host'] as const).map((key) => ({
    key,
    ...account.permissions[key],
  }));
  const allUnlocked = gates.every((g) => g.allowed);
  const canVerify =
    account.ageStatus !== 'VERIFIED' && account.ageStatus !== 'PENDING';

  return (
    <Section
      title={t.account.permissionsTitle}
      description={allUnlocked ? t.account.partyUnlocked : t.account.partyBody}
    >
      <ul className="grid gap-2 sm:grid-cols-3">
        {gates.map((gate) => (
          <li
            key={gate.key}
            className={`rounded-xl p-3 ring-1 ${gate.allowed ? 'bg-accent/5 ring-accent/20' : 'bg-white/[0.02] ring-white/5'}`}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              {gate.allowed ? (
                <CircleCheck size={16} className="text-accent" />
              ) : (
                <Lock size={16} className="text-muted" />
              )}
              {t.account.permissions[gate.key]}
            </p>
            {!gate.allowed ? (
              <p className="mt-1 text-xs text-muted">
                {gate.missing.map((m) => t.gates[m]).join(' ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="border-t border-white/5 pt-3">
        <p className="text-sm">
          {t.account.ageTitle}:{' '}
          <strong>{t.account.ageLabels[account.ageStatus]}</strong>
        </p>
        <p className="mt-1 text-xs text-muted">{t.account.ageExplainer}</p>
      </div>
      {canVerify ? (
        <Button
          disabled={
            busy === 'kyc' || !account.emailConfirmed || !account.nickname
          }
          onClick={() =>
            run('kyc', async () => {
              const { url } = await api<{ url: string }>(
                '/api/identity/sessions',
                { method: 'POST', body: {} },
              );
              trackEvent({ name: 'age_verification_start' });
              window.location.href = url;
            })
          }
        >
          {t.account.verifyAge}
        </Button>
      ) : null}
    </Section>
  );
}

function message(err: unknown, t: Dictionary): string {
  return err instanceof ApiClientError ? err.message : t.common.genericError;
}

export function AccountPanel({
  initial,
  notice,
  initialTab = 'profile',
}: {
  initial: AccountSummary;
  notice?: string;
  initialTab?: Tab;
}) {
  const t = useT();
  const router = useRouter();
  const [account, setAccount] = useState(initial);
  const [flash, setFlash] = useState<
    { tone: 'success' | 'error'; text: string } | undefined
  >(notice ? { tone: 'success', text: notice } : undefined);
  const [busy, setBusy] = useState<string>();
  const [tab, setTab] = useState<Tab>(initialTab);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setFlash(undefined);
    try {
      await fn();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'mfa_required') {
        router.push('/login/2fa?next=/account');
        return;
      }
      setFlash({ tone: 'error', text: message(err, t) });
    } finally {
      setBusy(undefined);
    }
  }

  async function reload() {
    setAccount(await api<AccountSummary>('/api/me'));
  }

  const emailAction = account.needsEmail || Boolean(account.pendingEmail);

  return (
    <div className="space-y-6">
      {flash ? <Alert tone={flash.tone}>{flash.text}</Alert> : null}

      <PlayHero account={account} />

      {!account.nickname ? (
        <NicknameSetup
          needsTerms={!account.termsVersion}
          onDone={(next) => {
            setAccount(next);
            setFlash({ tone: 'success', text: t.account.nicknameSaved });
          }}
        />
      ) : null}
      {emailAction ? (
        <EmailSection
          account={account}
          busy={busy}
          run={run}
          setFlash={setFlash}
        />
      ) : null}

      <PartySection account={account} busy={busy} run={run} />

      <div>
        <div
          role="tablist"
          className="mb-4 flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-white/5"
        >
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === key
                  ? 'bg-white/10 text-strong'
                  : 'text-muted hover:text-strong'
              }`}
            >
              {t.account.tabs[key]}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="space-y-6">
          {tab === 'profile' ? (
            account.nickname ? (
              <ProfileSection
                account={account}
                busy={busy}
                run={run}
                setAccount={setAccount}
                setFlash={setFlash}
              />
            ) : (
              <p className="text-sm text-muted">{t.gates.nickname}</p>
            )
          ) : null}
          {tab === 'security' ? (
            <SignInSection
              account={account}
              busy={busy}
              run={run}
              reload={reload}
              setFlash={setFlash}
            />
          ) : null}
          {tab === 'account' ? (
            <AccountSection account={account} busy={busy} run={run} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SignInSection({
  account,
  busy,
  run,
  reload,
  setFlash,
}: SectionProps & { reload: () => Promise<void> }) {
  const t = useT();
  return (
    <>
      <Section title={t.account.linkedTitle}>
        <ul className="space-y-2">
          {account.identities.map((identity) => (
            <li
              key={identity.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>
                {identity.provider === 'email'
                  ? t.account.emailAndPassword
                  : (PROVIDER_LABELS[identity.provider as OAuthProvider] ??
                    identity.provider)}
                {identity.email ? (
                  <span className="text-muted"> · {identity.email}</span>
                ) : null}
              </span>
              {account.identities.length > 1 ? (
                <button
                  className="text-xs text-red-300 hover:underline disabled:opacity-50"
                  disabled={busy === `unlink:${identity.id}`}
                  onClick={() =>
                    run(`unlink:${identity.id}`, async () => {
                      await api(`/api/auth/identities/${identity.id}`, {
                        method: 'DELETE',
                      });
                      await reload();
                      setFlash({ tone: 'success', text: t.account.unlinked });
                    })
                  }
                >
                  {t.account.unlink}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="grid gap-2">
          {OAUTH_PROVIDERS.filter(
            (p) => !account.identities.some((i) => i.provider === p),
          ).map((provider) => (
            <Button
              key={provider}
              variant="secondary"
              disabled={busy === `link:${provider}`}
              onClick={() =>
                run(`link:${provider}`, async () => {
                  const { url } = await api<{ url: string }>(
                    '/api/auth/link/start',
                    { body: { provider } },
                  );
                  window.location.href = url;
                })
              }
            >
              {t.account.link(PROVIDER_LABELS[provider])}
            </Button>
          ))}
        </div>
      </Section>

      <SecuritySection
        account={account}
        busy={busy}
        run={run}
        reload={reload}
        setFlash={setFlash}
      />
    </>
  );
}

function AccountSection({
  account,
  busy,
  run,
}: Omit<SectionProps, 'setFlash'>) {
  const t = useT();
  const router = useRouter();
  return (
    <>
      <Section title={t.account.sessionTitle}>
        <Button
          variant="secondary"
          disabled={busy === 'logout'}
          onClick={() =>
            run('logout', async () => {
              await api('/api/auth/logout', { method: 'POST', body: {} });
              router.push('/');
              router.refresh();
            })
          }
        >
          {t.account.signOut}
        </Button>
      </Section>
      <Section title={t.account.dangerTitle}>
        <DeleteAccount account={account} run={run} busy={busy} />
      </Section>
    </>
  );
}

type SectionProps = {
  account: AccountSummary;
  busy?: string;
  run: (key: string, fn: () => Promise<void>) => Promise<void>;
  setFlash: (
    flash: { tone: 'success' | 'error'; text: string } | undefined,
  ) => void;
};

function NicknameSetup({
  needsTerms,
  onDone,
}: {
  needsTerms: boolean;
  onDone: (a: AccountSummary) => void;
}) {
  const t = useT();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (needsTerms && form.get('acceptTerms') !== 'on') {
      setError(t.account.acceptTermsRequired);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      onDone(
        await api<AccountSummary>('/api/me', {
          method: 'PATCH',
          body: { nickname, ...(needsTerms ? { acceptTerms: true } : {}) },
        }),
      );
      trackEvent({ name: 'nickname_set' });
    } catch (err) {
      setError(message(err, t));
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title={t.account.chooseNickname}>
      <p className="text-sm text-muted">{t.account.nicknameExplainer}</p>
      <form onSubmit={onSubmit} className="space-y-3">
        {error ? <Alert>{error}</Alert> : null}
        <NicknameField value={nickname} onChange={setNickname} />
        {needsTerms ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acceptTerms" className="mt-1" />
            <span>
              {t.account.acceptTerms(
                <a href="/terms" target="_blank" className="text-accent">
                  {t.account.terms}
                </a>,
                <a href="/privacy" target="_blank" className="text-accent">
                  {t.common.privacyPolicy}
                </a>,
              )}
            </span>
          </label>
        ) : null}
        <Button type="submit" disabled={pending}>
          {t.account.saveNickname}
        </Button>
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
  const t = useT();
  const locale = useLocale();
  const [nickname, setNickname] = useState(account.nickname ?? '');
  const [now] = useState(() => Date.now());
  const nextChange = account.nicknameChangedAt
    ? new Date(Date.parse(account.nicknameChangedAt) + 30 * 86_400_000)
    : null;
  const locked = nextChange !== null && nextChange.getTime() > now;

  return (
    <Section title={t.account.profileTitle}>
      <NicknameField
        value={nickname}
        onChange={setNickname}
        current={account.nickname}
      />
      {locked ? (
        <p className="text-xs text-muted">
          {t.account.nextNicknameChange(nextChange!.toLocaleDateString(locale))}
        </p>
      ) : null}
      <Button
        disabled={
          locked || nickname === account.nickname || busy === 'nickname'
        }
        onClick={() =>
          run('nickname', async () => {
            setAccount(
              await api<AccountSummary>('/api/me', {
                method: 'PATCH',
                body: { nickname },
              }),
            );
            setFlash({ tone: 'success', text: t.account.nicknameUpdated });
          })
        }
      >
        {t.account.saveNickname}
      </Button>
    </Section>
  );
}

function EmailSection({ account, busy, run, setFlash }: SectionProps) {
  const t = useT();
  const [email, setEmail] = useState('');
  return (
    <Section
      title={
        account.needsEmail ? t.account.addEmail : t.account.pendingEmailTitle
      }
    >
      {account.pendingEmail ? (
        <p className="text-sm">
          {t.account.confirmPending(account.pendingEmail)}
        </p>
      ) : (
        <p className="text-sm text-muted">{t.account.xNoEmail}</p>
      )}
      <Field
        label={t.common.email}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <Button
        disabled={!email || busy === 'email'}
        onClick={() =>
          run('email', async () => {
            const res = await api<{ message?: string }>('/api/me', {
              method: 'PATCH',
              body: { email },
            });
            setFlash({
              tone: 'success',
              text: res.message ?? t.account.checkEmail,
            });
          })
        }
      >
        {t.account.sendConfirmation}
      </Button>
    </Section>
  );
}

function SecuritySection({
  account,
  busy,
  run,
  reload,
  setFlash,
}: SectionProps & { reload: () => Promise<void> }) {
  const t = useT();
  const [password, setPassword] = useState('');
  const [enroll, setEnroll] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  }>();
  const [code, setCode] = useState('');
  const hasPassword = account.identities.some((i) => i.provider === 'email');

  return (
    <Section title={t.account.securityTitle}>
      <Field
        label={hasPassword ? t.common.newPassword : t.account.createPassword}
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={t.common.passwordHint}
      />
      <Button
        variant="secondary"
        disabled={!password || busy === 'password'}
        onClick={() =>
          run('password', async () => {
            await api('/api/auth/password/set', { body: { password } });
            setPassword('');
            await reload();
            setFlash({ tone: 'success', text: t.account.passwordSaved });
          })
        }
      >
        {t.account.savePassword}
      </Button>

      <div className="border-t border-white/5 pt-3">
        <p className="mb-2 text-sm font-medium">{t.account.totpTitle}</p>
        {account.mfa.enabled ? (
          <ul className="space-y-2 text-sm">
            {account.mfa.factors.map((factor) => (
              <li key={factor.id} className="flex items-center justify-between">
                <span>✅ {factor.name}</span>
                <button
                  className="text-xs text-red-300 hover:underline"
                  onClick={() =>
                    run(`mfa:${factor.id}`, async () => {
                      await api(`/api/auth/mfa/${factor.id}`, {
                        method: 'DELETE',
                      });
                      await reload();
                      setFlash({
                        tone: 'success',
                        text: t.account.authenticatorRemoved,
                      });
                    })
                  }
                >
                  {t.account.remove}
                </button>
              </li>
            ))}
          </ul>
        ) : enroll ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t.account.scanQr}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enroll.qrCode}
              alt={t.account.qrAlt}
              className="h-44 w-44 rounded bg-white p-2"
            />
            <p className="break-all font-mono text-xs text-muted">
              {enroll.secret}
            </p>
            <Field
              label={t.common.code}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button
              disabled={code.length !== 6 || busy === 'mfa-verify'}
              onClick={() =>
                run('mfa-verify', async () => {
                  await api('/api/auth/mfa/verify', {
                    body: { factorId: enroll.factorId, code },
                  });
                  trackEvent({ name: 'mfa_enable' });
                  setEnroll(undefined);
                  setCode('');
                  await reload();
                  setFlash({ tone: 'success', text: t.account.totpEnabled });
                })
              }
            >
              {t.account.activate}
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
            {t.account.enableTotp}
          </Button>
        )}
      </div>
    </Section>
  );
}

function DeleteAccount({ account, run, busy }: Omit<SectionProps, 'setFlash'>) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        {t.account.deleteAccount}
      </Button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg bg-red-500/5 p-3 ring-1 ring-red-500/20">
      <p className="text-sm">
        {t.account.deleteWarning(account.nickname ?? account.email)}
      </p>
      <Field
        label={t.account.confirmation}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <Button
        variant="danger"
        disabled={!confirm || busy === 'delete'}
        onClick={() =>
          run('delete', async () => {
            await api('/api/me', { method: 'DELETE', body: { confirm } });
            trackEvent({ name: 'account_delete' });
            router.push('/');
            router.refresh();
          })
        }
      >
        {t.account.deleteForever}
      </Button>
    </div>
  );
}
