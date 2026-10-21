import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/cx';

export function Collapsible({
  icon,
  title,
  defaultOpen = false,
  disabled = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
  /** Form controls inside stay visible, but cannot be changed. */
  disabled?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button
        type="button"
        className="mt-0.5 flex w-full items-center gap-2 border-t border-line-soft bg-transparent px-0.5 py-3 text-[13px] font-[550] text-[#a5b4c3] hover:text-[#e1eaf2]"
        aria-expanded={open}
        onClick={() => setOpen((x) => !x)}
      >
        {icon} {title}
        <ChevronDown
          size={15}
          className={cx(
            'ml-auto transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <fieldset
          disabled={disabled}
          className="m-0 min-w-0 border-0 p-0 pt-1.5 [min-inline-size:0] disabled:opacity-60"
        >
          {children}
        </fieldset>
      )}
    </>
  );
}
