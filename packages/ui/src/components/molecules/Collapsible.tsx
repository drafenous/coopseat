import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../lib/cx';

export function Collapsible({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  defaultOpen?: boolean;
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
      {open && <div className="pt-1.5">{children}</div>}
    </>
  );
}
