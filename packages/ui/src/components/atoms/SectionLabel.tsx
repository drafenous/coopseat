import type { ReactNode } from 'react';

export function SectionLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-[7px] text-[11px] font-semibold tracking-[1.3px] text-[#9aabbb]">
      {icon} {children}
    </div>
  );
}
