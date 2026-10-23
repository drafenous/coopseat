import Link from 'next/link';
import { Brand } from '@coopseat/ui/design';
import { CookiePreferencesButton } from '@/components/CookieConsent';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { DOWNLOAD_URL } from '@/lib/links';
import { getPageSession } from '@/server/page-session';

export async function SiteFooter() {
  const [t, session, locale] = await Promise.all([
    getDictionary(),
    getPageSession(),
    getLocale(),
  ]);
  const h = t.home;
  const href = (path: string) => localeHref(locale, path);

  return (
    <footer className="border-t border-line-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Brand href={href('/')} version={null} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {h.footer.tagline}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-strong">
            {h.footer.product}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <a href={href(DOWNLOAD_URL)} className="hover:text-strong">
                {h.download}
              </a>
            </li>
            <li>
              <a href={href('/play')} className="hover:text-strong">
                {h.playInBrowser}
              </a>
            </li>
            <li>
              <Link href={href('/rooms')} className="hover:text-strong">
                {h.nav.rooms}
              </Link>
            </li>
            {!session && (
              <li>
                <Link href={href('/signup')} className="hover:text-strong">
                  {h.createAccount}
                </Link>
              </li>
            )}
            <li>
              <Link href={href('/account')} className="hover:text-strong">
                {h.footer.account}
              </Link>
            </li>
            <li>
              <Link href={href('/contact')} className="hover:text-strong">
                {h.footer.contact}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-strong">{h.footer.legal}</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link href={href('/terms')} className="hover:text-strong">
                {t.common.termsOfUse}
              </Link>
            </li>
            <li>
              <Link href={href('/privacy')} className="hover:text-strong">
                {t.common.privacyPolicy}
              </Link>
            </li>
            <li>
              <CookiePreferencesButton className="cursor-pointer hover:text-strong">
                {t.cookies.preferences}
              </CookiePreferencesButton>
            </li>{' '}
          </ul>
        </div>
      </div>
      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-6 text-sm text-subtle">
          <p>{h.footer.rights(new Date().getFullYear())}</p>
          <LanguageSwitcher className="ml-auto" />
        </div>
      </div>
    </footer>
  );
}
