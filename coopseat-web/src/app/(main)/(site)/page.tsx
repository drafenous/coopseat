import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  AudioLines,
  BadgeCheck,
  Cable,
  ChevronDown,
  Download,
  EyeOff,
  Gamepad2,
  Globe,
  Lock,
  Maximize,
  MessageSquare,
  MonitorPlay,
  MousePointerClick,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { HeroMock } from '@/components/landing/HeroMock';
import { PartyMock } from '@/components/landing/PartyMock';
import { getDictionary, getLocale } from '@/i18n/server';
import { DOWNLOAD_URL } from '@/lib/links';
import {
  ORGANIZATION_ID,
  SITE_NAME,
  SITE_URL,
  absoluteUrl,
  pageMetadata,
  softwareApplication,
} from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return pageMetadata({
    locale,
    path: '/',
    title: meta.title,
    description: meta.description,
    imageAlt: meta.title,
    absoluteTitle: true,
  });
}

const FEATURE_ICONS = [
  Zap,
  MonitorPlay,
  AudioLines,
  Maximize,
  Globe,
  SlidersHorizontal,
];
const STEP_ICONS = [Cable, MousePointerClick, Gamepad2];
const PARTY_ICONS = [Users, MessageSquare, ShieldCheck];
const TRUST_ICONS = [EyeOff, Lock, BadgeCheck];

const primaryCta =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-accent-border bg-accent px-6 py-3.5 text-[15px] font-[650] text-accent-ink shadow-[0_10px_34px_-8px_#b0f3d27a] transition hover:-translate-y-0.5 hover:bg-accent-hover';
const secondaryCta =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-white/[0.02] px-6 py-3.5 text-[15px] font-semibold text-[#d4dee8] transition hover:-translate-y-0.5 hover:bg-white/[0.06]';

function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
        {kicker}
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-strong sm:text-4xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-lg text-muted">{subtitle}</p>}
    </div>
  );
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
      {children}
    </span>
  );
}

export default async function Home() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const h = t.home;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        logo: absoluteUrl('/icon-512.png'),
      },
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: locale,
        publisher: { '@id': ORGANIZATION_ID },
      },
      softwareApplication(locale, t.meta.description),
      {
        '@type': 'FAQPage',
        mainEntity: h.faq.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <section id="hero" className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(#ffffff08_1px,transparent_1px),linear-gradient(90deg,#ffffff08_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 pt-16 pb-24 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-32">
          <div className="motion-safe:animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Sparkles size={13} />
              {h.badge}
            </span>
            <h1 className="mt-6 text-[2.75rem] leading-[1.04] font-bold tracking-[-0.045em] text-strong sm:text-6xl">
              {h.headlineLead}
              <br />
              <span className="bg-linear-to-r from-accent via-[#9ee7ff] to-[#f3c97a] bg-clip-text text-transparent">
                {h.headlineAccent}
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {h.pitch}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={DOWNLOAD_URL} className={primaryCta}>
                <Download size={18} />
                {h.download}
              </a>
              <a href="/play" className={secondaryCta}>
                <Play size={17} />
                {h.playInBrowser}
              </a>
            </div>
            <p className="mt-5 text-sm text-subtle">{h.heroNote}</p>
          </div>
          <div className="motion-safe:animate-rise [animation-delay:150ms]">
            <HeroMock t={h.mock} />
          </div>
        </div>
      </section>

      <section className="border-y border-line-soft bg-surface/40">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-6 lg:grid-cols-4">
          {h.stats.map((s) => (
            <div key={s.value} className="px-2 py-8 sm:px-6">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-3xl font-bold tracking-[-0.03em] text-strong">
                {s.value}
              </dd>
              <dd className="mt-1.5 text-sm leading-snug text-muted">
                {s.label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        id="features"
        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 sm:py-32"
      >
        <SectionHeading
          kicker={h.featuresKicker}
          title={h.featuresTitle}
          subtitle={h.featuresSubtitle}
        />
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {h.features.map((f, i) => {
            const Icon = FEATURE_ICONS[i] ?? Sparkles;
            return (
              <article
                key={f.title}
                className="rounded-2xl border border-line-soft bg-surface/50 p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-surface"
              >
                <IconTile>
                  <Icon size={20} />
                </IconTile>
                <h3 className="mt-5 text-lg font-semibold text-strong">
                  {f.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted">{f.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="how"
        className="scroll-mt-20 border-y border-line-soft bg-surface/30"
      >
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <SectionHeading kicker={h.howKicker} title={h.howTitle} />
          <div className="relative mt-16">
            <div
              aria-hidden
              className="absolute top-[34px] right-[16%] left-[16%] hidden h-px bg-linear-to-r from-transparent via-accent/40 to-transparent lg:block"
            />
            <ol className="relative grid gap-12 lg:grid-cols-3 lg:gap-6">
              {h.steps.map((s, i) => {
                const Icon = STEP_ICONS[i] ?? Sparkles;
                return (
                  <li
                    key={s.title}
                    className="relative flex flex-col items-center text-center"
                  >
                    <span className="relative grid size-[68px] place-items-center rounded-2xl border border-accent/30 bg-background text-accent shadow-[0_0_40px_-10px_#b0f3d266]">
                      <Icon size={26} />
                      <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-accent text-xs font-bold text-accent-ink">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-6 text-xl font-semibold text-strong">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-sm leading-relaxed text-muted">
                      {s.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="party"
        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 sm:py-32"
      >
        <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_top_right,#1d3346_0%,#131c26_55%)] p-8 sm:p-12 lg:p-16">
          <div
            aria-hidden
            className="absolute -bottom-32 -left-32 size-96 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative grid items-center gap-14 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">
                  {h.party.kicker}
                </p>
                <span className="rounded-full border border-[#f3c97a]/40 bg-[#f3c97a]/10 px-2.5 py-0.5 text-xs font-semibold text-warn">
                  {h.party.soon}
                </span>
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-strong sm:text-4xl">
                {h.party.title}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted">
                {h.party.body}
              </p>
              <ul className="mt-8 space-y-4">
                {h.party.points.map((p, i) => {
                  const Icon = PARTY_ICONS[i] ?? Sparkles;
                  return (
                    <li
                      key={p}
                      className="flex items-start gap-3 text-foreground"
                    >
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                        <Icon size={15} />
                      </span>
                      {p}
                    </li>
                  );
                })}
              </ul>
              <Link href="/signup" className={`${secondaryCta} mt-10`}>
                {h.party.cta}
                <ArrowRight size={17} />
              </Link>
            </div>
            <PartyMock t={h.party} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <SectionHeading kicker={h.trustKicker} title={h.trustTitle} />
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {h.trust.map((item, i) => {
            const Icon = TRUST_ICONS[i] ?? ShieldCheck;
            return (
              <div key={item.title} className="flex gap-4">
                <IconTile>
                  <Icon size={20} />
                </IconTile>
                <div>
                  <h3 className="font-semibold text-strong">{item.title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="faq"
        className="scroll-mt-20 border-t border-line-soft bg-surface/30"
      >
        <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-strong sm:text-4xl">
            {h.faqTitle}
          </h2>
          <div className="mt-12 space-y-3">
            {h.faq.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-line-soft bg-background/60 transition open:border-line open:bg-surface"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-strong [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-subtle transition group-open:rotate-180"
                  />
                </summary>
                <p className="-mt-1 px-5 pb-5 leading-relaxed text-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-[linear-gradient(135deg,#16352a_0%,#131c26_60%)] px-8 py-16 text-center sm:px-16">
          <div
            aria-hidden
            className="absolute top-0 left-1/2 h-64 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-3xl motion-safe:animate-glow"
          />
          <h2 className="relative text-3xl font-bold tracking-[-0.03em] text-strong sm:text-5xl">
            {h.ctaTitle}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted">
            {h.ctaBody}
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <a href={DOWNLOAD_URL} className={primaryCta}>
              <Download size={18} />
              {h.download}
            </a>
            <a href="/play" className={secondaryCta}>
              <Play size={17} />
              {h.playInBrowser}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
