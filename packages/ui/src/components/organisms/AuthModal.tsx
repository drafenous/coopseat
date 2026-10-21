import { useEffect, useState, type FormEvent } from 'react';
import type { Auth } from '../../hooks/useAuth';
import { OAUTH_PROVIDERS, PROVIDER_LABELS } from '../../lib/api';
import { errorText } from '../../lib/errors';
import { Button, Divider, TextButton, TextInput } from '../atoms';
import { Modal, ModalActions, ProviderButton } from '../molecules';
import { authError, authProviders } from './authStyles';
import { useT } from '../../i18n';

const field = 'mb-3 grid gap-1.5 text-[12px] text-muted';

export function AuthModal({ auth, onClose }: { auth: Auth; onClose(): void }) {
  const T = useT(),
    t = T.authModal;
  const [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (auth.status === 'signedIn') onClose();
  }, [auth.status, onClose]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const web = (path: string) => void run(() => auth.openWeb(path));

  if (auth.mfa) {
    const ready = recovery ? code.trim().length >= 8 : code.length === 6;
    const submit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (ready) void run(() => auth.submitMfa(code.trim()));
    };
    return (
      <Modal
        small
        labelledBy="mfa-title"
        onClose={() => {
          auth.cancelMfa();
          onClose();
        }}
        onSubmit={submit}
      >
        <h2 id="mfa-title">{t.mfaTitle}</h2>
        <p>{recovery ? t.securityHint : t.mfaBody}</p>
        <TextInput
          code={!recovery}
          autoFocus
          inputMode={recovery ? 'text' : 'numeric'}
          autoComplete={recovery ? 'off' : 'one-time-code'}
          aria-label={recovery ? t.securityCode : t.code}
          maxLength={recovery ? 40 : 6}
          value={code}
          onChange={(e) =>
            setCode(
              recovery ? e.target.value : e.target.value.replace(/\D/g, ''),
            )
          }
        />
        {error && (
          <p className={authError} role="alert">
            {error}
          </p>
        )}
        <ModalActions>
          <Button variant="secondary" onClick={auth.cancelMfa}>
            {T.common.back}
          </Button>
          <Button type="submit" inline disabled={busy || !ready}>
            {T.common.confirm}
          </Button>
        </ModalActions>
        <button
          type="button"
          className="mt-3 text-left text-[12px] text-accent hover:underline"
          onClick={() => {
            setRecovery((value) => !value);
            setCode('');
          }}
        >
          {recovery ? t.useApp : t.useSecurityCode}
        </button>
      </Modal>
    );
  }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void run(() => auth.startEmailLogin(email.trim() || undefined));
  };
  return (
    <Modal
      small
      closeButton
      labelledBy="auth-title"
      onClose={() => {
        auth.cancelOAuth();
        onClose();
      }}
      onSubmit={submit}
    >
      <h2 id="auth-title">{t.title}</h2>
      <p>{t.pitch}</p>
      <div className={authProviders}>
        {OAUTH_PROVIDERS.map((p) => (
          <ProviderButton
            key={p}
            provider={p}
            action={T.providers.continueWith}
            disabled={busy}
            onClick={() => void run(() => auth.startOAuth(p))}
          />
        ))}
      </div>
      {auth.waiting && (
        <div
          className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-dashed border-line p-3"
          role="status"
        >
          <p>
            {t.continueIn(
              auth.waiting === 'email'
                ? t.email
                : PROVIDER_LABELS[auth.waiting],
            )}
          </p>
          <Button variant="secondary" onClick={auth.cancelOAuth}>
            {T.common.cancel}
          </Button>
        </div>
      )}
      <Divider label={t.orWithEmail} />
      <label className={field}>
        {t.email}
        <TextInput
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      {error && (
        <p className={authError} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? t.signingIn : t.signIn}
      </Button>
      <div className="mt-3.5 flex justify-between gap-3">
        <TextButton flush onClick={() => web('/forgot-password')}>
          {t.forgot}
        </TextButton>
        <TextButton flush onClick={() => web('/signup')}>
          {t.createAccount}
        </TextButton>
      </div>
      <p className="mt-4 text-[12px] text-subtle">{t.adultsOnly}</p>
    </Modal>
  );
}
