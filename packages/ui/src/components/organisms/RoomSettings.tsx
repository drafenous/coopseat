import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import {
  Ban,
  Eye,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Power,
  ShieldCheck,
  X,
} from 'lucide-react';
import { LAYOUTS, type Layout } from '../../party/protocol';
import { coerceLayout } from '../../lib/party/layout';
import { errorText } from '../../lib/errors';
import {
  partyApi,
  type ModeratorInput,
  type RoomView,
} from '../../lib/party/api';
import type { OwnerRoomSettings } from '../../hooks/useOwnerRoomSettings';
import { Button, IconButton, Switch, TextInput } from '../atoms';
import { Collapsible, DropdownMenu, SelectField } from '../molecules';
import { useT } from '../../i18n';

type Props = {
  nickname: string;
  live: boolean;
  settings: OwnerRoomSettings;
  setError(message: string): void;
  setNotice(message: string): void;
  onEndSession(): void;
};
type Visibility = 'protected' | 'private' | 'public';
const PERMS = [
  'canKick',
  'canBan',
  'canStopStreams',
  'canApprove',
  'canGrantStream',
  'canDeleteMessages',
] as const;
const VISIBILITY_FLAGS: Record<
  Visibility,
  { requireApproval: boolean; whitelistEnabled: boolean }
> = {
  protected: { requireApproval: true, whitelistEnabled: true },
  private: { requireApproval: false, whitelistEnabled: true },
  public: { requireApproval: false, whitelistEnabled: false },
};

function visibilityOf(room: Pick<RoomView, 'requireApproval' | 'whitelistEnabled'>): Visibility {
  if (room.requireApproval) return 'protected';
  if (room.whitelistEnabled) return 'private';
  return 'public';
}

/** Owner-only room configuration (visibility, password, allow list, mods, bans). */
export function RoomSettings({
  nickname,
  live,
  settings,
  setError,
  setNotice,
  onEndSession,
}: Props) {
  const t = useT().party.settings,
    tl = useT().party.layout;
  const { room, bans, setRoom, setBans } = settings;
  const [password, setPassword] = useState('');
  const [allowNick, setAllowNick] = useState('');
  const [modNick, setModNick] = useState('');
  const [modMenu, setModMenu] = useState<string | null>(null);
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
    if (await run(() => partyApi.allow(allowNick.trim(), false), setRoom))
      setAllowNick('');
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
    <div className="px-4 pt-1 pb-4">
      <Collapsible
        icon={<KeyRound size={14} />}
        title={t.access}
        defaultOpen
      >
        <p className="mb-2 text-[12px] text-[#8494a5]">{t.accessHint}</p>
        <form onSubmit={submitPassword}>
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
      </Collapsible>

      <Collapsible icon={<Eye size={14} />} title={t.visibility}>
        <SelectField
          label={t.visibility}
          value={visibilityOf(room)}
          options={(['protected', 'private', 'public'] as const).map((id) => ({
            value: id,
            label: t.visibilityOptions[id],
          }))}
          disabled={busy}
          onChange={(v) => void update(VISIBILITY_FLAGS[v])}
        />
      </Collapsible>

      <Collapsible icon={<ListChecks size={14} />} title={t.whitelist}>
        <form className="mb-2 flex items-center gap-1.5" onSubmit={submitAllow}>
          <TextInput
            value={allowNick}
            maxLength={20}
            placeholder={t.nickname}
            aria-label={t.nickname}
            onChange={(e) => setAllowNick(e.target.value)}
          />
          <Button
            variant="secondary"
            compact
            type="submit"
            disabled={busy || allowNick.trim().length < 3}
          >
            {t.add}
          </Button>
        </form>
        {!room.whitelist.length ? (
          <ListEmpty
            icon={<ListChecks size={18} />}
            title={t.emptyWhitelist.title}
            hint={t.emptyWhitelist.hint}
          />
        ) : (
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
        )}
      </Collapsible>

      <Collapsible icon={<ShieldCheck size={14} />} title={t.moderators}>
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
        {!room.moderators.length ? (
          <ListEmpty
            icon={<ShieldCheck size={18} />}
            title={t.emptyModerators.title}
            hint={t.emptyModerators.hint}
          />
        ) : (
          <ul className="space-y-1">
            {room.moderators.map((m) => (
              <li
                key={m.profileId}
                className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13px] font-semibold text-[#d4dee8]"
              >
                <span className="min-w-0 flex-1 truncate">{m.nickname}</span>
                <DropdownMenu
                  dialog
                  label={t.modOptions(m.nickname)}
                  open={modMenu === m.profileId}
                  onOpenChange={(open) =>
                    setModMenu(open ? m.profileId : null)
                  }
                  triggerClassName="size-7 border-0"
                  menuClassName="min-w-[200px] p-2"
                >
                  <ul className="flex flex-col gap-2">
                    {PERMS.map((k) => (
                      <li key={k}>
                        <label className="flex items-center gap-2 text-[12px] font-normal text-[#a5b2c3]">
                          <Switch
                            checked={m[permKey(k)]}
                            disabled={busy}
                            onChange={(e) =>
                              setPerm(m, k, e.target.checked)
                            }
                          />
                          {t.modPerms[k]}
                        </label>
                      </li>
                    ))}
                  </ul>
                </DropdownMenu>
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
              </li>
            ))}
          </ul>
        )}
      </Collapsible>

      <Collapsible icon={<Ban size={14} />} title={t.bans}>
        {!bans.length ? (
          <ListEmpty
            icon={<Ban size={18} />}
            title={t.emptyBans.title}
            hint={t.emptyBans.hint}
          />
        ) : (
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
        )}
      </Collapsible>

      <Collapsible icon={<LayoutGrid size={14} />} title={t.layout}>
        <SelectField
          label={t.layout}
          value={coerceLayout(room.defaultLayout)}
          options={LAYOUTS.map((l) => ({ value: l, label: tl[l] }))}
          onChange={(v) => void update({ defaultLayout: v as Layout })}
        />
        <p className="mt-2 text-[12px] text-[#8494a5]">
          {t.limits(room.maxParticipants, room.maxStreamers)}
        </p>
      </Collapsible>

      {live && (
        <div className="mt-4 border-t border-line-soft pt-4">
          <Button
            variant="danger"
            wide
            onClick={() => {
              if (confirm(t.confirmEnd)) onEndSession();
            }}
          >
            <Power size={16} /> {t.endSession}
          </Button>
        </div>
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

function ListEmpty({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line-soft px-3 py-4 text-center">
      <div className="mx-auto mb-1.5 flex size-8 items-center justify-center rounded-full bg-[#ffffff0a] text-[#8494a5]">
        {icon}
      </div>
      <p className="text-[13px] font-medium text-[#c9d4de]">{title}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-[#8494a5]">{hint}</p>
    </div>
  );
}
