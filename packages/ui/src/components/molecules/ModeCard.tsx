import type { ReactNode } from 'react';

type Props = {
  illustration: ReactNode;
  icon: ReactNode;
  title: string;
  footer: ReactNode;
  children: ReactNode;
};

export function ModeCard({
  illustration,
  icon,
  title,
  footer,
  children,
}: Props) {
  return (
    <div className="flex flex-col items-start rounded-xl border border-[#2a3846] bg-[#0f1720] p-3.5">
      {illustration}
      <b className="mt-3 mb-1 flex items-center gap-[7px] text-[14px] text-[#e8eef4] [&>svg]:text-accent">
        {icon} {title}
      </b>
      <p className="text-[13px] leading-[1.5] [&_strong]:font-semibold [&_strong]:text-[#dbe5ed]">
        {children}
      </p>
      <small className="mt-2 flex flex-wrap items-center gap-[5px] text-[12px] text-[#8d9dad]">
        {footer}
      </small>
    </div>
  );
}
