'use client';

import type { RoomListing } from '../party/room-query';
import { useT } from '../i18n';
import { buttonClass } from '../components/atoms/Button';
import { Avatar } from '../components/organisms/Avatar';
import { cx } from '../lib/cx';
import { openDesktopRoom } from './open-desktop';

type Props = {
  room: RoomListing;
  partyHref?: string;
  onEnter?: () => void;
  downloadHref?: string;
  /** Directory rows sit in a list. Search keeps the standalone card. */
  layout?: 'card' | 'row';
};

export function RoomCard({
  room,
  partyHref,
  onEnter,
  downloadHref,
  layout = 'card',
}: Props) {
  const t = useT().directory;
  const enterClass = buttonClass({ inline: true, compact: true, className: 'w-auto' });
  const appClass = buttonClass({
    variant: 'secondary',
    compact: true,
    className: 'w-auto',
  });
  const status = (
    <span
      className={cx(
        'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        room.open ? 'bg-accent/15 text-accent' : 'bg-white/5 text-muted',
      )}
    >
      {room.open ? t.open : t.closed}
    </span>
  );
  const facts = (
    <>
      <p className="text-sm text-muted">
        {t.peopleLabel(room.people, room.capacity)}
      </p>
      <ul className="flex flex-wrap gap-1.5 text-[12px] text-[#c5d0db]">
        <li className="rounded-md bg-white/5 px-2 py-1">
          {room.hasPassword ? t.password : t.noPassword}
        </li>
        <li className="rounded-md bg-white/5 px-2 py-1">
          {room.inviteOnly
            ? t.inviteOnly
            : room.requireApproval
              ? t.approval
              : t.noApproval}
        </li>
      </ul>
    </>
  );
  const actions = (
    <div className={cx('flex flex-wrap gap-2', layout === 'card' && 'mt-auto')}>
      {onEnter ? (
        <button type="button" className={enterClass} onClick={onEnter}>
          {t.enter}
        </button>
      ) : (
        partyHref && (
          <a className={enterClass} href={partyHref}>
            {t.enter}
          </a>
        )
      )}
      {downloadHref && (
        <button
          type="button"
          className={appClass}
          onClick={() => openDesktopRoom(room.nickname, downloadHref)}
        >
          {t.openInApp}
        </button>
      )}
    </div>
  );
  const name = (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        account={{ nickname: room.nickname, avatarUrl: room.avatarUrl }}
      />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
          {t.host}
        </p>
        <h2 className="truncate text-lg font-semibold text-strong">
          {room.nickname}
        </h2>
      </div>
    </div>
  );

  if (layout === 'row') {
    return (
      <article className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-40 flex-1">{name}</div>
        {status}
        {facts}
        <div className="ml-auto">{actions}</div>
      </article>
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        {name}
        {status}
      </div>
      {facts}
      {actions}
    </article>
  );
}
