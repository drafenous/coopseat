import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { DesktopBanner } from '@/components/DesktopBanner';
import { DESKTOP_BANNER_COOKIE } from '@/components/desktop-banner';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { NICKNAME_PATTERN } from '@/lib/validation/account';
import { getPageAccount } from '@/server/page-session';
import { PartyClient } from './PartyClient';

/**
 * Gaming-Party room. Signed-out visitors go to login and come back here; everything else (verification
 * gate, password, lobby, offline) is decided by the join API and shown by the client.
 */
export default async function PartyPage({
  params,
}: PageProps<'/party/[nickname]'>) {
  const { nickname } = await params;
  if (!NICKNAME_PATTERN.test(nickname)) notFound();
  const [account, t, locale, jar] = await Promise.all([
    getPageAccount(),
    getDictionary(),
    getLocale(),
    cookies(),
  ]);
  if (!account)
    redirect(`/login?next=${encodeURIComponent(`/party/${nickname}`)}`);
  const page = t.playPage;
  const showBanner = jar.get(DESKTOP_BANNER_COOKIE)?.value !== 'hidden';
  return (
    <>
      {showBanner && (
        <DesktopBanner
          message={page.desktopBanner}
          downloadHref={localeHref(locale, '/download')}
          downloadLabel={page.download}
          closeLabel={t.cookies.close}
        />
      )}
      <div className="play-app flex min-h-0 flex-1 flex-col">
        <PartyClient locale={locale} nickname={nickname} />
      </div>
    </>
  );
}
