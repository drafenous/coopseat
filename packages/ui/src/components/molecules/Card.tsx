import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="w-[min(440px,100%)] rounded-2xl border border-line bg-surface p-7 text-foreground shadow-[0_24px_60px_#00000060]">
      <h1 className="m-0 text-[20px] font-semibold tracking-[-0.3px] text-strong">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-[13px] text-muted [&_a]:text-accent [&_a]:no-underline">
          {subtitle}
        </p>
      )}
      <div className="mt-[22px] flex flex-col gap-3 [&>label]:mb-0">
        {children}
      </div>
    </section>
  );
}
