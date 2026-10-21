import { cookies } from 'next/headers';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { DesktopBanner } from '@/components/DesktopBanner';
import { DESKTOP_BANNER_COOKIE } from '@/components/desktop-banner';
import { PlayClient } from './PlayClient';

export default async function PlayPage() {
  const [t, locale, jar] = await Promise.all([
    getDictionary(),
    getLocale(),
    cookies(),
  ]);
  const page = t.playPage;
  const showBanner = jar.get(DESKTOP_BANNER_COOKIE)?.value !== 'hidden';
  return (
    <>
      <section className="sr-only">
        <h1>{page.title}</h1>
        <p>{page.body}</p>
        <p>{page.requirements}</p>
        <a href={localeHref(locale, '/download')}>{page.download}</a>
      </section>
      {showBanner && (
        <DesktopBanner
          message={page.desktopBanner}
          downloadHref={localeHref(locale, '/download')}
          downloadLabel={page.download}
          closeLabel={t.cookies.close}
        />
      )}
      <div className="play-app flex min-h-0 flex-1 flex-col">
        <PlayClient locale={locale} />
      </div>
    </>
  );
}
