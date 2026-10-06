import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

/** `flush` drops the bottom gap used in stacked panels; `inline` flows inside a sentence. */
export function TextButton({
  flush,
  inline,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  flush?: boolean;
  inline?: boolean;
}) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'items-center gap-1.5 border-0 bg-transparent text-[13px] text-accent',
        inline ? 'inline p-0' : cx('flex', flush ? 'p-0' : 'pb-4'),
      )}
    />
  );
}
