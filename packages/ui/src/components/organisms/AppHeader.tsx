import { CircleHelp, Settings, Wrench } from 'lucide-react';
import type { Auth } from '../../hooks/useAuth';
import { useT } from '../../i18n';
import { platform } from '../../platform';
import { IconButton } from '../atoms';
import { Brand, StatusPill, type CaptureStatus } from '../molecules';
import { AccountMenu, accountTriggerClass } from './AccountMenu';

type Props = {
  status: CaptureStatus;
  auth: Auth;
  onHelp(): void;
  onTroubleshoot(): void;
  onPreferences(): void;
  onLogin(): void;
  onMyAccount(): void;
  onMyRoom?(): void;
  onSignOut(): void;
};

export function AppHeader({
  status,
  auth,
  onHelp,
  onTroubleshoot,
  onPreferences,
  onLogin,
  onMyAccount,
  onMyRoom,
  onSignOut,
}: Props) {
  const t = useT().header;
  const a = auth.account;
  return (
    <header className="flex h-[68px] flex-none items-center justify-between gap-4 border-b border-[#ffffff0d] bg-[#0e141b] px-[clamp(16px,2.5vw,48px)] immersive:hidden">
      <Brand version={platform().kind === 'web' ? null : undefined} />
      <div className="flex items-center gap-5">
        <StatusPill status={status} />
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
