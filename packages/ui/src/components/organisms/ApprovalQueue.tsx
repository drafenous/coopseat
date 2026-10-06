import { Check, DoorOpen, X } from 'lucide-react';
import type { PendingUser } from '../../party/protocol';
import { IconButton, SectionLabel } from '../atoms';
import { useT } from '../../i18n';

/** Lobby: these people have no peer connections yet, so approving is what exposes the room to them. */
export function ApprovalQueue({
  users,
  onDecide,
}: {
  users: PendingUser[];
  onDecide(id: string, approve: boolean): void;
}) {
  const t = useT().party.approvals;
  if (!users.length) return null;
  return (
    <section className="border-b border-line-soft px-4 py-3">
      <SectionLabel icon={<DoorOpen size={14} />}>
        {t.title.toUpperCase()} · {users.length}
      </SectionLabel>
      <ul className="space-y-1">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex items-center gap-2 text-[13px] text-[#d4dee8]"
          >
            <span className="min-w-0 flex-1 truncate">{u.nick}</span>
            <IconButton
              size="sm"
              label={`${t.approve} ${u.nick}`}
              className="text-accent"
              onClick={() => onDecide(u.id, true)}
            >
              <Check size={16} />
            </IconButton>
            <IconButton
              size="sm"
              label={`${t.deny} ${u.nick}`}
              onClick={() => onDecide(u.id, false)}
            >
              <X size={16} />
            </IconButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
