import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-block min-w-[22px] rounded-[5px] border border-b-2 border-[#3a4856] bg-[#18222c] px-1.5 py-0.5 text-center [font-family:inherit] text-[11px] leading-[1.3] font-semibold text-[#dbe5ed]">
      {children}
    </kbd>
  );
}
