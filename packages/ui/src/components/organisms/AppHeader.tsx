import { CircleHelp, Monitor, Settings, Wrench } from 'lucide-react';
import type { Auth } from '../../hooks/useAuth';
import { useT } from '../../i18n';
import { platform } from '../../platform';
import { RoomSearch } from '../../rooms/RoomSearch';
import { IconButton } from '../atoms';
import { buttonClass } from '../atoms/Button';
import { Brand } from '../molecules';
import { AccountMenu, accountTriggerClass } from './AccountMenu';

type Props = {
  auth: Auth;
  onHelp(): void;
  onTroubleshoot(): void;
  onPreferences(): void;
  onLogin(): void;
  onMyAccount(): void;
  onMyRoom?(): void;
  onSignOut(): void;
  onOpenRoom(nickname: string): void;
  onRooms(): void;
  onBrowseRooms(): void;
  roomsOpen: boolean;
  onOpenDesktop?: () => void;
  /** Web only: search results can hand the room to the desktop app. */
  downloadHref?: string;
};

export function AppHeader({
  auth,
  onHelp,
  onTroubleshoot,
  onPreferences,
  onLogin,
  onMyAccount,
  onMyRoom,
  onSignOut,
  onOpenRoom,
  onRooms,
  onBrowseRooms,
  roomsOpen,
  onOpenDesktop,
  downloadHref,
}: Props) {
  const t = useT().header;
  const a = auth.account;
  return (
    <header className="flex h-[68px] flex-none items-center justify-between gap-4 border-b border-[#ffffff0d] bg-[#0e141b] px-[clamp(16px,2.5vw,48px)] immersive:hidden">
      <Brand version={platform().kind === 'web' ? null : undefined} />
      <div className="ml-auto flex items-center gap-3">
        <RoomSearch
          onOpenRoom={onOpenRoom}
          onBrowse={onBrowseRooms}
          downloadHref={downloadHref}
        />
        <button
          type="button"
          aria-pressed={roomsOpen}
          onClick={onRooms}
          className={
            roomsOpen
              ? 'rounded-lg bg-white/10 px-3 py-2 text-[13px] font-semibold text-strong'
              : 'rounded-lg px-3 py-2 text-[13px] font-semibold text-[#c5d0db] hover:bg-white/5'
          }
        >
          {t.rooms}
        </button>
        {onOpenDesktop && (
          <button
            type="button"
            onClick={onOpenDesktop}
            className={buttonClass({
              variant: 'secondary',
              compact: true,
              className: 'w-auto',
            })}
          >
            <Monitor size={15} />
            {t.openInApp}
          </button>
        )}
        <div className="flex items-center gap-1">
          <IconButton label={t.troubleshoot} onClick={onTroubleshoot}>
            <Wrench size={19} />
          </IconButton>
          <IconButton label={t.help} onClick={onHelp}>
            <CircleHelp size={20} />
          </IconButton>
          <IconButton label={t.preferences} onClick={onPreferences}>
            <Settings size={19} />
          </IconButton>
        </div>
        {auth.available &&
          auth.status !== 'loading' &&
          (a ? (
            <AccountMenu
              account={a}
              labels={t}
              onMyAccount={onMyAccount}
              onMyRoom={onMyRoom}
              onSignOut={onSignOut}
            />
          ) : (
            <button
              type="button"
              className={accountTriggerClass(true)}
              onClick={onLogin}
            >
              {t.signIn}
            </button>
          ))}
      </div>
    </header>
  );
}
