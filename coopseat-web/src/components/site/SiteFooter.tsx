import Link from 'next/link';
import { Brand } from '@coopseat/ui/design';
import { CookiePreferencesButton } from '@/components/CookieConsent';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getDictionary } from '@/i18n/server';
import { DOWNLOAD_URL } from '@/lib/links';

export async function SiteFooter() {
  const t = await getDictionary();
  const h = t.home;

  return (
    <footer className="border-t border-line-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <Brand href="/" version={null} />
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
              <a href={DOWNLOAD_URL} className="hover:text-strong">
                {h.download}
              </a>
            </li>
            <li>
              <a href="/play" className="hover:text-strong">
                {h.playInBrowser}
              </a>
            </li>
            <li>
              <Link href="/signup" className="hover:text-strong">
                {h.createAccount}
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-strong">
                {h.footer.account}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-strong">{h.footer.legal}</p>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>
              <Link href="/terms" className="hover:text-strong">
                {t.common.termsOfUse}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-strong">
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
