import { useEffect, useState } from 'react';
import {
  Link2,
  MessageSquare,
  PanelLeftClose,
  PanelRightClose,
  Settings2,
  Users,
} from 'lucide-react';
import type { OwnerRoomSettings } from '../../hooks/useOwnerRoomSettings';
import type { Party } from '../../hooks/useParty';
import { cx } from '../../lib/cx';
import { IconButton } from '../atoms';
import type { PanelSide } from '../templates/MainLayout';
import { ApprovalQueue } from './ApprovalQueue';
import { ChatPanel } from './ChatPanel';
import { ParticipantList } from './ParticipantList';
import { RoomSettings } from './RoomSettings';
import { StreamRequests } from './StreamRequests';
import { useT } from '../../i18n';

type Tab = 'chat' | 'people' | 'settings';
type Props = {
  party: Party;
  side: PanelSide;
  shareUrl: string;
  ownerSettings: OwnerRoomSettings | null;
  onCollapse(): void;
  setError(message: string): void;
  setNotice(message: string): void;
};

/** Second side panel: chat, people, moderation queues and (for the owner) room settings. */
export function RoomPanel({
  party: p,
  side,
  shareUrl,
  ownerSettings,
  onCollapse,
  setError,
  setNotice,
}: Props) {
  const all = useT(),
    t = all.party;
  const [tab, setTab] = useState<Tab>('chat');
  const live = p.phase === 'live';
  const peers = Object.values(p.peers);
  useEffect(() => {
    p.chat.setViewing(tab === 'chat');
    return () => p.chat.setViewing(false);
  }, [tab, p.chat]);
  const copy = () =>
    void navigator.clipboard.writeText(shareUrl).then(
      () => setNotice(t.copied),
      () => setError(shareUrl),
    );
  const tabs: { id: Tab; label: string; icon: typeof Users; badge?: number }[] =
    [
      {
        id: 'chat',
        label: t.tabs.chat,
        icon: MessageSquare,
        badge: p.chat.unread || undefined,
      },
      {
        id: 'people',
        label: t.tabs.people,
        icon: Users,
        badge: peers.length || undefined,
      },
      ...(p.isOwner
        ? [{ id: 'settings' as const, label: t.tabs.settings, icon: Settings2 }]
        : []),
    ];
  const active = tabs.find((x) => x.id === tab) ?? tabs[0]!;
  const ActiveIcon = active.icon;
  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#2a3542] bg-[#121921] immersive:hidden max-[750px]:min-h-[420px]">
      <div className="flex flex-none flex-col px-5 pt-[18px] min-[1800px]:px-6 min-[1800px]:pt-[22px]">
        <div className="mb-[14px] flex items-center gap-[9px] text-[#c3d0dd]">
          <ActiveIcon size={18} />
          <h2 className="min-w-0 flex-1 truncate text-[16px] font-[550] min-[1800px]:text-[17px]">
            {active.label}
          </h2>
          <IconButton size="sm" label={t.copyLink} onClick={copy}>
            <Link2 size={16} />
          </IconButton>
          <IconButton
            size="sm"
            label={all.settings.collapse}
            onClick={onCollapse}
          >
            {side === 'right' ? (
              <PanelRightClose size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </IconButton>
        </div>
        <div
          role="tablist"
          className="mb-3 flex gap-0.5 rounded-lg bg-[#ffffff08] p-0.5"
        >
          {tabs.map(({ id, label, badge }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cx(
                'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold',
                tab === id
                  ? 'bg-[#1c2630] text-[#e3ebf2] shadow-sm'
                  : 'text-[#8494a5] hover:text-[#c3d0dd]',
              )}
            >
              <span className="truncate">{label}</span>
              {badge ? (
                <span className="rounded-full bg-[#ffffff14] px-1.5 text-[11px]">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      {live && p.perms?.approve && (
        <ApprovalQueue
          users={p.pending}
          onDecide={(id, ok) => void p.moderation.approve(id, ok)}
        />
      )}
      {live && p.perms?.grantStream && (
        <StreamRequests
          users={p.requests}
          onGrant={p.moderation.grant}
          onDeny={p.moderation.revoke}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
        {tab === 'chat' && (
          <ChatPanel
            messages={p.chat.messages}
            selfId={p.self?.id ?? null}
            ownerId={p.ownerId}
            enabled={live && p.chatEnabled}
            canChat={Boolean(p.self?.chat)}
            canDelete={Boolean(p.perms?.deleteMessages)}
            onSend={p.sendChat}
            onDelete={p.moderation.deleteMessage}
          />
        )}
        {tab === 'people' && (
          <ParticipantList
            peers={peers}
            selfId={p.self?.id ?? null}
            perms={p.perms}
            selfRole={p.self?.role ?? null}
            actions={p.moderation}
          />
        )}
        {tab === 'settings' && p.isOwner && ownerSettings && (
          <RoomSettings
            nickname={p.nickname}
            live={live}
            settings={ownerSettings}
            setError={setError}
            setNotice={setNotice}
            onEndSession={() => void p.endSession()}
          />
        )}
      </div>
    </aside>
  );
}
