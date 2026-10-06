import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Ban,
  CircleAlert,
  Clock,
  DoorClosed,
  KeyRound,
  Loader2,
  LogIn,
  Radio,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { Party } from '../../hooks/useParty';
import { errorText } from '../../lib/errors';
import { Button, TextInput } from '../atoms';
import { Alert } from '../molecules';
import { useT } from '../../i18n';

type Props = {
  party: Party;
  signedIn: boolean;
  onSignIn(): void;
  onOpenAccount(): void;
  onStart(): void;
  /** Why the side panel's source can't be streamed yet, if it can't. */
  startBlocked?: string;
};

function Panel({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-line-soft bg-[#121921] text-[#a5b2c3]">
        {icon}
      </div>
      <h2 className="mb-2 text-[18px] font-semibold text-[#e3ebf2]">{title}</h2>
      {body && (
        <p className="mb-5 max-w-[440px] text-[14px] leading-[1.55] text-[#a5b2c3]">
          {body}
        </p>
      )}
      {children}
    </div>
  );
}

/** Everything shown instead of the stage while the user isn't (yet) a live participant. Returns null when live. */
export function PartyGate({
  party: p,
  signedIn,
  onSignIn,
  onOpenAccount,
  onStart,
  startBlocked,
}: Props) {
  const tp = useT().party,
    t = tp.gate;
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const notice = (
    <p className="mt-6 max-w-[460px] text-[12px] leading-[1.5] text-[#6f7f90]">
      {t.ipNotice}
    </p>
  );

  if (!signedIn)
    return (
      <Panel icon={<LogIn size={24} />} title={t.signIn}>
        <Button inline onClick={onSignIn}>
          {t.signIn}
        </Button>
      </Panel>
    );
  if (p.phase === 'live') return null;
  if (p.phase === 'loading' || p.phase === 'connecting')
    return (
      <Panel
        icon={
          <Loader2
            size={24}
            className="animate-spin motion-reduce:animate-none"
          />
        }
        title={t.loading}
      />
    );
  if (p.phase === 'error')
    return (
      <Panel icon={<CircleAlert size={24} />} title={p.failure}>
        <Button variant="secondary" onClick={p.rejoin}>
          {t.retry}
        </Button>
      </Panel>
    );
  if (p.phase === 'pending')
    return (
      <Panel icon={<Clock size={24} />} title={t.pending} body={t.pendingBody}>
        {notice}
      </Panel>
    );
  if (p.phase === 'ended')
    return (
      <Panel
        icon={<DoorClosed size={24} />}
        title={t.ended[p.endReason ?? 'owner_ended']}
        body={t.endedBody}
      >
        <Button variant="secondary" onClick={p.rejoin}>
          {t.retry}
        </Button>
      </Panel>
    );
  if (p.phase === 'removed')
    return (
      <Panel
        icon={<Ban size={24} />}
        title={t.removed[p.removedReason ?? 'invalid']}
      >
        {p.removedReason === 'full' || p.removedReason === 'replaced' ? (
          <Button variant="secondary" onClick={p.rejoin}>
            {t.retry}
          </Button>
        ) : null}
      </Panel>
    );

  const a = p.access;
  if (!a) return null;
  switch (a.state) {
    case 'offline':
      return a.isOwner ? (
        <Panel
          icon={<Radio size={24} />}
          title={t.ownerOffline}
          body={t.ownerOfflineBody}
        >
          <Button
            inline
            disabled={p.busy || Boolean(startBlocked)}
            onClick={onStart}
          >
            <Radio size={17} /> {tp.stream.start}
          </Button>
          {startBlocked && (
            <p className="mt-3 text-[13px] text-[#a5b2c3]">{startBlocked}</p>
          )}
          {notice}
        </Panel>
      ) : (
        <Panel
          icon={<DoorClosed size={24} />}
          title={t.offline(a.room.owner)}
          body={t.offlineBody}
        >
          <Button variant="secondary" onClick={p.rejoin}>
            {t.retry}
          </Button>
        </Panel>
      );
    case 'password_required': {
      const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await p.join({ password });
        } catch (err) {
          setError(errorText(err));
        } finally {
          setBusy(false);
        }
      };
      return (
        <Panel icon={<KeyRound size={24} />} title={t.password}>
          <form
            className="flex w-full max-w-[340px] flex-col gap-2.5"
            onSubmit={submit}
          >
            <TextInput
              type="password"
              autoComplete="off"
              autoFocus
              value={password}
              maxLength={64}
              aria-label={t.passwordLabel}
              placeholder={t.passwordLabel}
              aria-invalid={Boolean(error) || undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <Alert>{error}</Alert>}
            <Button type="submit" disabled={busy || !password}>
              {t.enter}
            </Button>
          </form>
          {notice}
        </Panel>
      );
    }
    case 'not_invited':
      return (
        <Panel
          icon={<UserCheck size={24} />}
          title={t.notInvited}
          body={t.notInvitedBody}
        />
      );
    case 'banned':
      return <Panel icon={<Ban size={24} />} title={t.banned} />;
    case 'unavailable':
      return <Panel icon={<ShieldAlert size={24} />} title={t.unavailable} />;
    case 'disabled':
      return <Panel icon={<ShieldAlert size={24} />} title={t.disabled} />;
    case 'requirements':
      return (
        <Panel
          icon={<ShieldAlert size={24} />}
          title={t.requirements}
          body={t.requirementsBody}
        >
          <ul className="mb-5 space-y-1 text-[14px] text-[#d4dee8]">
            {a.missing.map((m) => (
              <li key={m}>· {t.missing[m] ?? m}</li>
            ))}
          </ul>
          <Button inline onClick={onOpenAccount}>
            {t.openAccount}
          </Button>
        </Panel>
      );
    default:
      return null;
  }
}
