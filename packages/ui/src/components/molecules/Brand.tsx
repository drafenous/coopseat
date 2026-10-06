import { Armchair } from 'lucide-react';

export function Brand({
  href = '#',
  version = '0.1',
}: {
  href?: string;
  version?: string | null;
}) {
  return (
    <a
      className="flex items-center gap-[9px] text-[24px] font-bold tracking-[-1.2px] text-strong no-underline"
      href={href}
    >
      <span className="mr-[3px] grid size-[35px] place-items-center rounded-[10px] bg-accent text-[#122b25]">
        <Armchair size={22} />
      </span>
      coop<span className="-ml-[5px] font-normal text-[#a5b2c0]">seat</span>
      {version && (
        <span className="mt-1 ml-1 rounded border border-[#33404b] px-1.5 py-[3px] text-[11px] tracking-normal text-[#97a6b3]">
          {version}
        </span>
      )}
    </a>
  );
}
