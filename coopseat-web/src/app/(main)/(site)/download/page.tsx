import type { Metadata } from 'next';
import { Cable, Cpu, Download, HardDrive, HardDriveDownload, Info, Monitor, Play, Sparkles, Usb, Wifi } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { getDictionary, getLocale } from '@/i18n/server';
import { INSTALLER_URL, PORTABLE_URL } from '@/lib/links';
import { pageMetadata, softwareApplication } from '@/lib/seo';
import { latestRelease, type LatestRelease } from '@/server/releases';

const REQUIREMENT_ICONS = [Monitor, Cpu, Cable, Usb, HardDrive, Wifi];

const primaryCta =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-accent-border bg-accent px-6 py-3.5 text-[15px] font-[650] text-accent-ink shadow-[0_10px_34px_-8px_#b0f3d27a] transition hover:-translate-y-0.5 hover:bg-accent-hover';
const secondaryCta =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-white/[0.02] px-6 py-3.5 text-[15px] font-semibold text-[#d4dee8] transition hover:-translate-y-0.5 hover:bg-white/[0.06]';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return pageMetadata({ locale, path: '/download', title: meta.download, description: meta.downloadDescription, imageAlt: meta.title });
}

async function findRelease(): Promise<LatestRelease | null> {
  try {
    return await latestRelease();
  } catch (err) {
    console.error('Download page: latest release unavailable', err instanceof Error ? err.message : err);
    return null;
  }
}

export default async function DownloadPage() {
  const [t, locale, release] = await Promise.all([getDictionary(), getLocale(), findRelease()]);
  const d = t.download;
  const megabytes = new Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 0 });
  const date = release && new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(release.publishedAt));
  const options = release
    ? [
        { variant: 'installer' as const, href: INSTALLER_URL, Icon: HardDriveDownload, copy: d.installer, primary: true },
        { variant: 'portable' as const, href: PORTABLE_URL, Icon: Usb, copy: d.portable, primary: false },
      ].filter((o) => release.files[o.variant])
    : [];

  const installerSize = release?.files.installer?.size;
  const structuredData = {
    '@context': 'https://schema.org',
    ...softwareApplication(
      locale,
      t.meta.downloadDescription,
      release
        ? {
            softwareVersion: release.version,
            datePublished: release.publishedAt,
            ...(installerSize ? { fileSize: `${Math.round(installerSize / 1_000_000)}MB` } : {}),
          }
        : {},
    ),
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute -top-40 left-1/2 h-[420px] w-[800px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28">
          <p className="text-sm font-semibold tracking-[0.18em] text-accent uppercase">{d.kicker}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-strong sm:text-5xl">{d.title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">{d.subtitle}</p>

          {release ? (
            <>
              <p className="mt-10 text-sm text-subtle">
                {d.version(release.version)} · {d.released(date!)}
              </p>
              <div className={`mx-auto mt-5 grid gap-4 text-left ${options.length > 1 ? 'sm:grid-cols-2' : 'max-w-md'}`}>
                {options.map(({ variant, href, Icon, copy, primary }) => (
                  <article
                    key={variant}
                    className={`flex flex-col rounded-2xl border p-6 ${primary ? 'border-accent/35 bg-surface' : 'border-line bg-surface/60'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent">
                        <Icon size={20} />
                      </span>
                      <h2 className="text-lg font-semibold text-strong">{copy.title}</h2>
                      {primary && (
                        <span className="ml-auto rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                          {d.recommended}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 flex-1 leading-relaxed text-muted">{copy.body}</p>
                    <a href={href} className={`${primary ? primaryCta : secondaryCta} mt-6`}>
                      <Download size={18} />
                      {copy.button}
                    </a>
                    <p className="mt-3 text-center text-xs text-subtle">
                      {release.files[variant]!.fileName} · {megabytes.format(release.files[variant]!.size / 1_000_000)}
                    </p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p role="status" className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-surface/60 p-6 text-muted">
              {d.unavailable}
            </p>
          )}
          <a href="/play" className={`${secondaryCta} mt-8`}>
            <Play size={17} />
            {t.home.playInBrowser}
          </a>
        </div>
      </section>

      <section className="border-y border-line-soft bg-surface/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-strong">{d.stepsTitle}</h2>
          <ol className="mt-12 grid gap-6 lg:grid-cols-3">
            {d.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line-soft bg-background/60 p-6">
                <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold text-strong">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="requirements" className="mx-auto max-w-4xl scroll-mt-20 px-6 py-20 sm:py-24">
        <h2 className="text-center text-3xl font-bold tracking-[-0.03em] text-strong">{d.requirementsTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-muted">{d.requirementsSubtitle}</p>
        <dl className="mt-12 divide-y divide-line-soft overflow-hidden rounded-2xl border border-line-soft bg-surface/50">
          {d.requirements.map((r, i) => {
            const Icon = REQUIREMENT_ICONS[i] ?? Sparkles;
            return (
              <div key={r.label} className="flex flex-col gap-2 px-6 py-5 sm:grid sm:grid-cols-[14rem_1fr] sm:items-center sm:gap-4">
                <dt className="flex items-center gap-3 font-semibold text-strong">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Icon size={18} />
                  </span>
                  {r.label}
                </dt>
                <dd className="text-muted">{r.value}</dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-10 rounded-2xl border border-line-soft p-6">
          <h3 className="flex items-center gap-2 font-semibold text-strong">
            <Info size={18} className="text-accent" />
            {d.notesTitle}
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted">
            {d.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
