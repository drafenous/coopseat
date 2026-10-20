import { useState } from 'react';
import { cx } from '../../lib/cx';
import type { Account } from '../../lib/api';

export function Avatar({
  account,
  small,
}: {
  account: Pick<Account, 'nickname' | 'email' | 'avatarUrl'>;
  small?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const initial = (account.nickname ?? account.email ?? '?')[0].toUpperCase();
  const className = cx(
    'grid flex-none place-items-center rounded-full bg-[#26333f] object-cover font-bold text-accent',
    small ? 'size-[30px] text-[13px]' : 'size-11',
  );
  return account.avatarUrl && !broken ? (
    <img
      className={className}
      src={account.avatarUrl}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  ) : (
    <span className={className} aria-hidden="true">
      {initial}
    </span>
  );
}
