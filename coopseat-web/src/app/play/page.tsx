import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { PlayClient } from './PlayClient';

export default async function PlayPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const page = t.playPage;
  return (
    <>
      <section className="shrink-0 border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-lg font-semibold text-[#eef3f7]">
              {page.title}
            </h1>
            <p className="mt-1 text-sm leading-relaxed">{page.body}</p>
            <p className="mt-1 text-sm leading-relaxed">{page.requirements}</p>
          </div>
          <a
            href={localeHref(locale, '/download')}
            className="shrink-0 text-sm font-semibold text-[#8bf5ca] underline-offset-4 hover:underline"
          >
            {page.download}
          </a>
        </div>
      </section>
      <div className="play-app flex min-h-0 flex-1 flex-col">
        <PlayClient locale={locale} />
      </div>
    </>
  );
}
