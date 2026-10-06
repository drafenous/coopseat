import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Ban,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Power,
  ShieldCheck,
  X,
} from 'lucide-react';
import { LAYOUTS, type Layout } from '../../party/protocol';
import { errorText } from '../../lib/errors';
import {
  partyApi,
  type BanEntry,
  type ModeratorInput,
  type RoomView,
} from '../../lib/party/api';
import { Button, IconButton, SectionLabel, Switch, TextInput } from '../atoms';
import { SelectField, ToggleField } from '../molecules';
import { useT } from '../../i18n';

type Props = {
  nickname: string;
  live: boolean;
  setError(message: string): void;
  setNotice(message: string): void;
  onEndSession(): void;
};
const PERMS = [
  'canKick',
  'canBan',
  'canStopStreams',
  'canApprove',
  'canGrantStream',
  'canDeleteMessages',
] as const;

/** Owner-only room configuration. Every change goes through the BFF, which enforces "at least one protection". */
export function RoomSettings({
  nickname,
  live,
  setError,
  setNotice,
  onEndSession,
}: Props) {
  const t = useT().party.settings,
    tl = useT().party.layout;
  const [room, setRoom] = useState<RoomView | null>(null);
  const [bans, setBans] = useState<BanEntry[]>([]);
  const [password, setPassword] = useState('');
  const [allowNick, setAllowNick] = useState(''),
    [allowStream, setAllowStream] = useState(false);
  const [modNick, setModNick] = useState('');
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, apply: (v: T) => void, notice = true) => {
      setBusy(true);
      try {
        apply(await fn());
        if (notice) setNotice(t.saved);
        return true;
      } catch (e) {
        setError(errorText(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [setError, setNotice, t.saved],
  );

  useEffect(() => {
    void run(partyApi.room, setRoom, false);
    void run(
      () => partyApi.bans(nickname),
      (r) => setBans(r.bans),
      false,
    );
  }, [nickname, run]);

  if (!room)
    return (
      <p className="px-4 py-6 text-center text-[13px] text-[#8494a5]">…</p>
    );
  const update = (body: Parameters<typeof partyApi.updateRoom>[0]) =>
    run(() => partyApi.updateRoom(body), setRoom);
  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (await update({ password })) setPassword('');
  };
  const submitAllow = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await run(() => partyApi.allow(allowNick.trim(), allowStream), setRoom)
    ) {
      setAllowNick('');
      setAllowStream(false);
    }
  };
  const submitMod = async (e: FormEvent) => {
    e.preventDefault();
    if (
      await run(
        () => partyApi.addModerator({ nickname: modNick.trim() }),
        setRoom,
      )
    )
      setModNick('');
  };
  const setPerm = (
    m: RoomView['moderators'][number],
    key: (typeof PERMS)[number],
    value: boolean,
  ) => {
    const input: ModeratorInput = { nickname: m.nickname };
    for (const k of PERMS) input[k] = k === key ? value : m[permKey(k)];
    void run(() => partyApi.addModerator(input), setRoom);
  };

  return (
    <div className="space-y-5 px-4 py-4">
      <section>
        <SectionLabel icon={<KeyRound size={14} />}>
          {t.access.toUpperCase()}
        </SectionLabel>
        <p className="mb-2 text-[12px] text-[#8494a5]">{t.accessHint}</p>
        <form className="mb-3" onSubmit={submitPassword}>
          <p className="mb-1.5 text-[13px] text-[#c9d4de]">
            {t.password} ·{' '}
            <span className="text-[#8494a5]">
              {room.hasPassword ? t.passwordSet : t.passwordNone}
            </span>
          </p>
          <div className="flex gap-1.5">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={password}
              minLength={4}
              maxLength={64}
              placeholder={t.passwordPlaceholder}
              aria-label={t.password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              variant="secondary"
              compact
              type="submit"
              disabled={busy || password.length < 4}
            >
              {t.setPassword}
            </Button>
            {room.hasPassword && (
              <Button
                variant="danger"
                compact
                disabled={busy}
                onClick={() => void update({ password: null })}
              >
                {t.removePassword}
              </Button>
            )}
          </div>
        </form>
        <ToggleField
          label={t.approval}
          hint={t.approvalHint}
          checked={room.requireApproval}
          disabled={busy}
          onChange={(v) => void update({ requireApproval: v })}
        />
        <ToggleField
          label={t.whitelist}
          hint={t.whitelistHint}
          checked={room.whitelistEnabled}
          disabled={busy}
          onChange={(v) => void update({ whitelistEnabled: v })}
        />
      </section>

      <section>
        <SectionLabel icon={<ListChecks size={14} />}>
          {t.whitelist.toUpperCase()}
        </SectionLabel>
        <form className="mb-2 flex items-center gap-1.5" onSubmit={submitAllow}>
          <TextInput
            value={allowNick}
            maxLength={20}
            placeholder={t.nickname}
            aria-label={t.nickname}
            onChange={(e) => setAllowNick(e.target.value)}
          />
          <label className="flex flex-none items-center gap-1.5 text-[12px] text-[#a5b2c3]">
            <Switch
              checked={allowStream}
              onChange={(e) => setAllowStream(e.target.checked)}
            />
            {t.canStream}
          </label>
          <Button
            variant="secondary"
            compact
            type="submit"
            disabled={busy || allowNick.trim().length < 3}
          >
            {t.add}
          </Button>
        </form>
        <ul className="space-y-1">
          {room.whitelist.map((w) => (
            <li
              key={w.profileId}
              className="flex items-center gap-2 text-[13px] text-[#d4dee8]"
            >
              <span className="min-w-0 flex-1 truncate">{w.nickname}</span>
              <label className="flex items-center gap-1.5 text-[12px] text-[#a5b2c3]">
                <Switch
                  checked={w.canStream}
                  disabled={busy}
                  onChange={(e) =>
                    void run(
                      () => partyApi.allow(w.nickname, e.target.checked),
                      setRoom,
                    )
                  }
                />
                {t.canStream}
              </label>
              <IconButton
                size="xs"
                label={t.remove(w.nickname)}
                disabled={busy}
                onClick={() =>
                  void run(() => partyApi.disallow(w.profileId), setRoom)
                }
              >
                <X size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel icon={<ShieldCheck size={14} />}>
          {t.moderators.toUpperCase()}
        </SectionLabel>
        <form className="mb-2 flex gap-1.5" onSubmit={submitMod}>
          <TextInput
            value={modNick}
            maxLength={20}
            placeholder={t.nickname}
            aria-label={t.nickname}
            onChange={(e) => setModNick(e.target.value)}
          />
          <Button
            variant="secondary"
            compact
            type="submit"
            disabled={busy || modNick.trim().length < 3}
          >
            {t.add}
          </Button>
        </form>
        <ul className="space-y-3">
          {room.moderators.map((m) => (
            <li
              key={m.profileId}
              className="rounded-lg border border-line-soft p-2.5"
            >
              <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[#d4dee8]">
                <span className="min-w-0 flex-1 truncate">{m.nickname}</span>
                <IconButton
                  size="xs"
                  label={t.remove(m.nickname)}
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => partyApi.removeModerator(m.profileId),
                      setRoom,
                    )
                  }
                >
                  <X size={14} />
                </IconButton>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                {PERMS.map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-1.5 text-[12px] text-[#a5b2c3]"
                  >
                    <Switch
                      checked={m[permKey(k)]}
                      disabled={busy}
                      onChange={(e) => setPerm(m, k, e.target.checked)}
                    />
                    {t.modPerms[k]}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel icon={<Ban size={14} />}>
          {t.bans.toUpperCase()}
        </SectionLabel>
        {!bans.length && (
          <p className="text-[12px] text-[#8494a5]">{t.noBans}</p>
        )}
        <ul className="space-y-1">
          {bans.map((b) => (
            <li
              key={b.profileId}
              className="flex items-center gap-2 text-[13px] text-[#d4dee8]"
            >
              <span className="min-w-0 flex-1 truncate">
                {b.nickname}{' '}
                <span className="text-[11px] text-[#8494a5]">
                  ·{' '}
                  {b.expiresAt
                    ? t.until(new Date(b.expiresAt).toLocaleString())
                    : t.forever}
                </span>
              </span>
              <Button
                variant="secondary"
                compact
                disabled={busy}
                onClick={() =>
                  void run(
                    () => partyApi.unban(nickname, b.profileId),
                    (r) => setBans(r.bans),
                  )
                }
              >
                {t.unban}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionLabel icon={<LayoutGrid size={14} />}>
          {t.layout.toUpperCase()}
        </SectionLabel>
        <SelectField
          label={t.layout}
          value={room.defaultLayout}
          options={LAYOUTS.map((l) => ({ value: l, label: tl[l] }))}
          onChange={(v) => void update({ defaultLayout: v as Layout })}
        />
        <p className="mt-2 text-[12px] text-[#8494a5]">
          {t.limits(room.maxParticipants, room.maxStreamers)}
        </p>
      </section>

      {live && (
        <Button
          variant="danger"
          wide
          onClick={() => {
            if (confirm(t.confirmEnd)) onEndSession();
          }}
        >
          <Power size={16} /> {t.endSession}
        </Button>
      )}
    </div>
  );
}

/** Moderator rows from the API use the perm names of the room token (kick, ban…). */
function permKey(k: (typeof PERMS)[number]) {
  return (
    {
      canKick: 'kick',
      canBan: 'ban',
      canStopStreams: 'stopStreams',
      canApprove: 'approve',
      canGrantStream: 'grantStream',
      canDeleteMessages: 'deleteMessages',
    } as const
  )[k];
}
