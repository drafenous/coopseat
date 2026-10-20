'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Alert, Button, Field } from '@/components/ui';
import { useLocale, useT } from '@/i18n/client';
import { api, ApiClientError } from '@/lib/client/api';
import { downloadText, qrImageSrc, securityCodeFile } from '@/lib/mfa';

type Enrollment = { factorId: string; qrCode: string; secret: string };

function message(err: unknown, fallback: string): string {
  return err instanceof ApiClientError ? err.message : fallback;
}

function Dialog({
  titleId,
  title,
  locked,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  locked?: boolean;
  onClose(): void;
  children: ReactNode;
}) {
  const t = useT();
  useEffect(() => {
    if (locked) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03070bcc] p-5 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (!locked && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100vh-40px)] w-[min(480px,100%)] overflow-y-auto rounded-2xl border border-white/10 bg-surface p-6 shadow-[0_24px_60px_#000000a0]"
      >
        {locked ? null : (
          <button
            type="button"
            className="absolute top-3.5 right-3.5 text-muted hover:text-white"
            aria-label={t.account.cancel}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
        <h2 id={titleId} className="pr-8 text-lg font-semibold text-white">
          {title}
        </h2>
        <div className="mt-3 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function CodeGrid({ codes }: { codes: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2">
      {codes.map((code) => (
        <li
          key={code}
          className="rounded-lg bg-white/5 px-2 py-1.5 text-center font-mono text-sm tracking-wide"
        >
          {code}
        </li>
      ))}
    </ul>
  );
}

export function SecurityCodesPanel({
  codes,
  onDone,
}: {
  codes: string[];
  onDone(): void;
}) {
  const t = useT();
  const locale = useLocale();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const file = securityCodeFile(
    t.account.securityCodesFile(new Date().toLocaleString(locale)),
    codes,
  );

  return (
    <>
      <p className="text-sm text-muted">{t.account.securityCodesBody}</p>
      <CodeGrid codes={codes} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          wide={false}
          onClick={() => {
            void navigator.clipboard.writeText(codes.join('\n')).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? t.account.copied : t.account.copy}
        </Button>
        <Button
          type="button"
          variant="secondary"
          wide={false}
          onClick={() => downloadText('coopseat-security-codes.txt', file)}
        >
          {t.account.downloadCodes}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
        />
        {t.account.savedCodes}
      </label>
      <Button type="button" disabled={!saved} onClick={onDone}>
        {t.account.done}
      </Button>
    </>
  );
}

export function TotpEnrollModal({
  onClose,
  onEnabled,
}: {
  onClose(): void;
  onEnabled(): void;
}) {
  const t = useT();
  const [enroll, setEnroll] = useState<Enrollment>();
  const [error, setError] = useState<string>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[]>();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    api<Enrollment>('/api/auth/mfa/enroll', { body: {} })
      .then((next) => {
        if (alive) setEnroll(next);
      })
      .catch((err: unknown) => {
        if (alive) setError(message(err, t.common.genericError));
      });
    return () => {
      alive = false;
    };
  }, [t.common.genericError]);

  function close() {
    if (codes) return;
    const factorId = enroll?.factorId;
    onClose();
    if (factorId) {
      void api(`/api/auth/mfa/${factorId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
  }

  async function confirm() {
    if (!enroll) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ securityCodes?: string[] }>('/api/auth/mfa/verify', {
        body: { factorId: enroll.factorId, code },
      });
      setCodes(res.securityCodes ?? []);
    } catch (err) {
      setError(message(err, t.mfa.invalid));
    } finally {
      setBusy(false);
    }
  }

  if (codes) {
    return (
      <Dialog titleId="totp-codes-title" title={t.account.securityCodesTitle} locked onClose={onClose}>
        <SecurityCodesPanel codes={codes} onDone={onEnabled} />
      </Dialog>
    );
  }

  return (
    <Dialog titleId="totp-setup-title" title={t.account.totpTitle} onClose={close}>
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted">{t.account.totpIntro}</p>
      {enroll ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageSrc(enroll.qrCode)}
            alt={t.account.qrAlt}
            className="h-44 w-44 rounded bg-white p-2"
          />
          <div>
            <p className="mb-1 text-xs text-muted">{t.account.setupKey}</p>
            <p className="break-all font-mono text-xs">{enroll.secret}</p>
            <button
              type="button"
              className="mt-1 text-xs text-accent hover:underline"
              onClick={() => {
                void navigator.clipboard.writeText(enroll.secret).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? t.account.copied : t.account.copy}
            </button>
          </div>
          <Field
            label={t.common.code}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            hint={t.account.enterCode}
          />
          <Button
            type="button"
            disabled={code.length !== 6 || busy}
            onClick={() => void confirm()}
          >
            {busy ? t.mfa.pending : t.account.activate}
          </Button>
        </>
      ) : error ? null : (
        <p className="text-sm text-muted">{t.mfa.pending}</p>
      )}
    </Dialog>
  );
}

export function DisableTotpModal({
  factorId,
  onClose,
  onDisabled,
}: {
  factorId: string;
  onClose(): void;
  onDisabled(): void;
}) {
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      await api('/api/auth/mfa/disable', { body: { factorId, code: code.trim() } });
      onDisabled();
    } catch (err) {
      setError(message(err, t.mfa.invalid));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog titleId="totp-disable-title" title={t.account.disableTotp} onClose={onClose}>
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted">{t.account.disableBody}</p>
      <Field
        label={t.common.code}
        autoComplete="one-time-code"
        maxLength={40}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" wide={false} onClick={onClose}>
          {t.account.cancel}
        </Button>
        <Button
          type="button"
          variant="danger"
          wide={false}
          disabled={code.trim().length < 6 || busy}
          onClick={() => void submit()}
        >
          {busy ? t.mfa.pending : t.account.disableConfirm}
        </Button>
      </div>
    </Dialog>
  );
}

export function RegenerateCodesModal({
  onClose,
  onDone,
}: {
  onClose(): void;
  onDone(): void;
}) {
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState<string[]>();

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const res = await api<{ securityCodes: string[] }>(
        '/api/auth/mfa/security-codes',
        { body: { code } },
      );
      setCodes(res.securityCodes);
    } catch (err) {
      setError(message(err, t.mfa.invalid));
    } finally {
      setBusy(false);
    }
  }

  if (codes) {
    return (
      <Dialog titleId="totp-new-codes-title" title={t.account.securityCodesTitle} locked onClose={onClose}>
        <SecurityCodesPanel codes={codes} onDone={onDone} />
      </Dialog>
    );
  }

  return (
    <Dialog titleId="totp-regenerate-title" title={t.account.generateCodes} onClose={onClose}>
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm text-muted">{t.account.regenerateBody}</p>
      <Field
        label={t.common.code}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
      />
      <Button
        type="button"
        disabled={code.length !== 6 || busy}
        onClick={() => void submit()}
      >
        {busy ? t.mfa.pending : t.account.generateCodes}
      </Button>
    </Dialog>
  );
}
