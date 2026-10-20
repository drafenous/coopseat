import { useState } from 'react';
import { ChevronDown, LogOut, Play, Tv, UserRound } from 'lucide-react';
import type { Account } from '../../lib/api';
import { cx } from '../../lib/cx';
import { MenuDivider, MenuItem } from '../atoms';
import { DropdownMenu } from '../molecules';
import { Avatar } from './Avatar';

export type AccountMenuAccount = Pick<
  Account,
  'nickname' | 'email' | 'avatarUrl'
>;

export const accountTriggerClass = (login?: boolean, open?: boolean) =>
  cx(
    'flex items-center gap-2 rounded-full border border-line-strong text-[13px] font-semibold text-[#d4dee8] hover:bg-[#ffffff0a]',
    open ? 'bg-[#ffffff0a]' : 'bg-transparent',
    login ? 'px-4 py-[7px]' : 'py-[5px] pr-2.5 pl-1.5',
  );

export function AccountMenu({
  account,
  labels,
  onMyAccount,
  onMyRoom,
  onPlay,
  onSignOut,
}: {
  account: AccountMenuAccount;
  labels: {
    myAccount: string;
    myRoom: string;
    play?: string;
    signOut: string;
  };
  onMyAccount(): void;
  onMyRoom?: () => void;
  onPlay?: () => void;
  onSignOut(): void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <DropdownMenu
      label={labels.myAccount}
      open={menu}
      onOpenChange={setMenu}
      menuClassName="w-max whitespace-nowrap"
      trigger={(p) => (
        <button
          type="button"
          className={accountTriggerClass(false, menu)}
          aria-label={labels.myAccount}
          {...p}
        >
          <Avatar small account={account} />
          {account.nickname ?? labels.myAccount}
          <ChevronDown
            size={14}
            className={cx(
              'text-[#9aabbb] transition-transform',
              menu && 'rotate-180',
            )}
          />
        </button>
      )}
    >
      <MenuItem className="w-auto!" onClick={onMyAccount}>
        <UserRound size={15} /> {labels.myAccount}
      </MenuItem>
      {onMyRoom && (
        <MenuItem className="w-auto!" onClick={onMyRoom}>
          <Tv size={15} /> {labels.myRoom}
        </MenuItem>
      )}
      {onPlay && labels.play && (
        <MenuItem className="w-auto!" onClick={onPlay}>
          <Play size={15} /> {labels.play}
        </MenuItem>
      )}
      <MenuDivider />
      <MenuItem className="w-auto!" danger onClick={onSignOut}>
        <LogOut size={15} /> {labels.signOut}
      </MenuItem>
    </DropdownMenu>
  );
}
