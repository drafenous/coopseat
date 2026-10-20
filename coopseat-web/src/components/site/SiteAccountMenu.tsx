'use client';

import { useRouter } from 'next/navigation';
import { AccountMenu, type AccountMenuAccount } from '@coopseat/ui/design';
import { api } from '@/lib/client/api';

export function SiteAccountMenu({
  account,
  labels,
}: {
  account: AccountMenuAccount;
  labels: {
    myAccount: string;
    myRoom: string;
    play: string;
    signOut: string;
  };
}) {
  const router = useRouter();
  const nickname = account.nickname;
  return (
    <AccountMenu
      account={account}
      labels={labels}
      onMyAccount={() => router.push('/account')}
      onMyRoom={
        nickname
          ? () => router.push(`/party/${encodeURIComponent(nickname)}`)
          : undefined
      }
      onPlay={() => router.push('/play')}
      onSignOut={() => {
        void api('/api/auth/logout', { method: 'POST', body: {} })
          .then(() => {
            window.location.assign('/');
          })
          .catch(() => undefined);
      }}
    />
  );
}
