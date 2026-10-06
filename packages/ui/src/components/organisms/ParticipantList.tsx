import { useState } from 'react';
import {
  Ban,
  Crown,
  Radio,
  RadioTower,
  ShieldCheck,
  UserMinus,
  WifiOff,
} from 'lucide-react';
import type { ModPerms, Participant } from '../../party/protocol';
import { MenuDivider, MenuItem } from '../atoms';
import { DropdownMenu } from '../molecules';
import { useT } from '../../i18n';

export type ModerationActions = {
  grant(id: string): void;
  revoke(id: string): void;
  kill(id: string): void;
  kick(id: string): void;
  ban(id: string, hours?: number): void;
};
type Props = {
  peers: Participant[];
  selfId: string | null;
  perms: ModPerms | null;
  selfRole: Participant['role'] | null;
  actions: ModerationActions;
};

const ROLE_ORDER = { owner: 0, moderator: 1, member: 2 };

/** Who is in the session. Actions only appear when the server would accept them (the signal server re-checks). */
export function ParticipantList({
  peers,
  selfId,
  perms,
  selfRole,
  actions,
}: Props) {
  const t = useT().party.people;
  const [menu, setMenu] = useState<string | null>(null);
  const sorted = [...peers].sort(
    (a, b) =>
      ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
      Number(b.streaming) - Number(a.streaming) ||
      a.nick.localeCompare(b.nick),
  );
  // Nobody acts on the owner, and moderators don't act on each other.
  const targetable = (p: Participant) =>
    p.id !== selfId &&
    p.role !== 'owner' &&
    !(selfRole === 'moderator' && p.role === 'moderator');
  return (
    <ul className="space-y-0.5 px-2 py-2">
      {sorted.map((p) => {
        const can = perms && targetable(p);
        const streamItems = can
          ? [
              perms.grantStream && !p.canStream && (
                <MenuItem key="grant" onClick={() => actions.grant(p.id)}>
                  <Radio size={15} /> {t.grant}
                </MenuItem>
              ),
              perms.grantStream && p.canStream && p.role === 'member' && (
                <MenuItem key="revoke" onClick={() => actions.revoke(p.id)}>
                  <RadioTower size={15} /> {t.revoke}
                </MenuItem>
              ),
              perms.stopStreams && p.streaming && (
                <MenuItem key="kill" onClick={() => actions.kill(p.id)}>
                  <RadioTower size={15} /> {t.kill}
                </MenuItem>
              ),
            ].filter(Boolean)
          : [];
        const removeItems = can
          ? [
              perms.kick && (
                <MenuItem key="kick" danger onClick={() => actions.kick(p.id)}>
                  <UserMinus size={15} /> {t.kick}
                </MenuItem>
              ),
              perms.ban && (
                <MenuItem
                  key="ban24"
                  danger
                  onClick={() => actions.ban(p.id, 24)}
                >
                  <Ban size={15} /> {t.ban24}
                </MenuItem>
              ),
              perms.ban && (
                <MenuItem
                  key="ban"
                  danger
                  onClick={() => {
                    if (confirm(t.confirmBan(p.nick))) actions.ban(p.id);
                  }}
                >
                  <Ban size={15} /> {t.ban}
                </MenuItem>
              ),
            ].filter(Boolean)
          : [];
        return (
          <li
            key={p.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#ffffff08]"
          >
            <span className="flex size-6 flex-none items-center justify-center text-[#9aabbb]">
              {p.role === 'owner' ? (
                <Crown size={15} className="text-accent" aria-label={t.owner} />
              ) : p.role === 'moderator' ? (
                <ShieldCheck size={15} aria-label={t.moderator} />
              ) : null}
            </span>
            <span
              className={`min-w-0 flex-1 truncate text-[13px] ${p.connected ? 'text-[#d4dee8]' : 'text-[#6f7f90]'}`}
            >
              {p.nick}
            </span>
            {!p.connected && (
              <WifiOff
                size={14}
                className="text-[#6f7f90]"
                aria-label={t.away}
              />
            )}
            {p.streaming && (
              <span className="rounded bg-[#a8f0cb17] px-1.5 py-0.5 text-[10px] font-bold tracking-[0.8px] text-accent">
                {t.streaming.toUpperCase()}
              </span>
            )}
            {streamItems.length + removeItems.length > 0 && (
              <DropdownMenu
                label={t.actions(p.nick)}
                open={menu === p.id}
                onOpenChange={(o) => setMenu(o ? p.id : null)}
                triggerClassName="size-7"
                menuClassName="min-w-[210px]"
              >
                {streamItems}
                {streamItems.length > 0 && removeItems.length > 0 && (
                  <MenuDivider />
                )}
                {removeItems}
              </DropdownMenu>
            )}
          </li>
        );
      })}
    </ul>
  );
}
