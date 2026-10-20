'use client';

import { useRouter } from 'next/navigation';
import { AccountMenu, type AccountMenuAccount } from '@coopseat/ui/design';
import { localeHref } from '@/i18n/config';
import { useLocale } from '@/i18n/client';
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
  const locale = useLocale();
  const href = (path: string) => localeHref(locale, path);
  const nickname = account.nickname;
  return (
    <AccountMenu
      account={account}
      labels={labels}
      onMyAccount={() => router.push(href('/account'))}
      onMyRoom={
        nickname
          ? () => router.push(href(`/party/${encodeURIComponent(nickname)}`))
          : undefined
      }
      onPlay={() => router.push(href('/play'))}
      onSignOut={() => {
        void api('/api/auth/logout', { method: 'POST', body: {} })
          .then(() => {
            window.location.assign(href('/'));
          })
          .catch(() => undefined);
      }}
    />
  );
}
