import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionaries/en';

type Props = {
  t: Dictionary['legal'];
  title: string;
  subtitle: string;
  sections: readonly { heading: string; body: ReactNode }[];
  related: { href: string; label: string };
};

const sectionId = (index: number) => `section-${index + 1}`;

export function LegalPage({ t, title, subtitle, sections, related }: Props) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line-soft">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(#ffffff08_1px,transparent_1px),linear-gradient(90deg,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_90%_at_50%_0%,#000_30%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="absolute -top-48 left-1/2 h-96 w-[800px] -translate-x-1/2 rounded-full bg-accent/10 blur-[110px]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
            {t.kicker}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] text-strong sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-muted">{subtitle}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[220px_1fr] lg:gap-16 lg:py-20">
        <aside className="hidden lg:block">
          <nav className="sticky top-28">
            <p className="text-xs font-semibold tracking-[0.14em] text-subtle uppercase">
              {t.onThisPage}
            </p>
            <ol className="mt-4 space-y-1 border-l border-line-soft">
              {sections.map((s, i) => (
                <li key={s.heading}>
                  <a
                    href={`#${sectionId(i)}`}
                    className="-ml-px block border-l border-transparent py-1.5 pl-4 text-sm text-muted transition hover:border-accent hover:text-strong"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl">
          <div className="space-y-4">
            {sections.map((s, i) => (
              <section
                key={s.heading}
                id={sectionId(i)}
                className="scroll-mt-24 rounded-2xl border border-line-soft bg-surface/50 p-6 sm:p-8"
              >
                <h2 className="text-xl font-semibold tracking-[-0.01em] text-strong">
                  {s.heading}
                </h2>
                <div className="mt-3 text-[15px] leading-relaxed text-muted [&_li]:pl-1 [&_li::marker]:text-accent [&_strong]:text-foreground">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <Link
            href={related.href}
            className="group mt-10 flex items-center justify-between gap-4 rounded-2xl border border-line-soft p-6 transition hover:border-accent/40 hover:bg-surface/50"
          >
            <span>
              <span className="block text-xs font-semibold tracking-[0.14em] text-subtle uppercase">
                {t.alsoRead}
              </span>
              <span className="mt-1 block text-lg font-semibold text-strong">
                {related.label}
              </span>
            </span>
            <ArrowRight
              size={20}
              className="text-accent transition group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </>
  );
}
