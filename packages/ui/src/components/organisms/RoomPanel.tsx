import { useState } from 'react';
import {
  Link2,
  MessageSquare,
  MessageSquareOff,
  PanelLeftClose,
  PanelRightClose,
  Settings2,
  Users,
} from 'lucide-react';
import type { Party } from '../../hooks/useParty';
import { cx } from '../../lib/cx';
import { Button, IconButton } from '../atoms';
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
  onCollapse(): void;
  setError(message: string): void;
  setNotice(message: string): void;
};

/** Second side panel: chat, people, moderation queues and (for the owner) room settings. */
export function RoomPanel({
  party: p,
  side,
  shareUrl,
  onCollapse,
  setError,
  setNotice,
}: Props) {
  const all = useT(),
    t = all.party;
  const [tab, setTab] = useState<Tab>('chat');
  const live = p.phase === 'live';
  const peers = Object.values(p.peers);
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
        badge: p.chat.unread,
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
  return (
    <aside className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-[#2a3542] bg-[#121921] immersive:hidden max-[750px]:min-h-[420px]">
      <div className="flex flex-none items-center gap-1 border-b border-line-soft px-2 py-1.5">
        <div role="tablist" className="flex min-w-0 flex-1 gap-0.5">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                if (id === 'chat' && !p.chat.visible) p.chat.setVisible(true);
              }}
              className={cx(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold',
                tab === id
                  ? 'bg-[#ffffff0d] text-[#e3ebf2]'
                  : 'text-[#8494a5] hover:text-[#c3d0dd]',
              )}
            >
              <Icon size={15} />
              {label}
              {badge ? (
                <span className="rounded-full bg-[#ffffff14] px-1.5 text-[11px]">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <IconButton size="sm" label={t.copyLink} onClick={copy}>
          <Link2 size={16} />
        </IconButton>
        {tab === 'chat' && (
          <IconButton
            size="sm"
            label={p.chat.visible ? t.chat.hide : t.chat.show}
            onClick={() => p.chat.setVisible(!p.chat.visible)}
          >
            {p.chat.visible ? (
              <MessageSquareOff size={16} />
            ) : (
              <MessageSquare size={16} />
            )}
          </IconButton>
        )}
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
        {tab === 'chat' &&
          (p.chat.visible ? (
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
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <Button
                variant="secondary"
                onClick={() => p.chat.setVisible(true)}
              >
                <MessageSquare size={15} /> {t.chat.show}
              </Button>
            </div>
          ))}
        {tab === 'people' && (
          <ParticipantList
            peers={peers}
            selfId={p.self?.id ?? null}
            perms={p.perms}
            selfRole={p.self?.role ?? null}
            actions={p.moderation}
          />
        )}
        {tab === 'settings' && p.isOwner && (
          <RoomSettings
            nickname={p.nickname}
            live={live}
            setError={setError}
            setNotice={setNotice}
            onEndSession={() => void p.endSession()}
          />
        )}
      </div>
    </aside>
  );
}
