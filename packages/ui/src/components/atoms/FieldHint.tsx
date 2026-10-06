import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

/** `flush` drops the outer margin, for hints laid out by a parent `Field`. */
export function FieldHint({
  warn,
  muted,
  flush,
  children,
}: {
  warn?: boolean;
  muted?: boolean;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={cx(
        'flex items-center gap-1.5 text-[12px]',
        warn ? 'text-warn' : muted ? 'text-subtle' : 'text-ok',
        flush ? 'm-0' : warn ? 'mt-2' : '-mt-1.5 mb-3',
      )}
    >
      {children}
    </p>
  );
}
