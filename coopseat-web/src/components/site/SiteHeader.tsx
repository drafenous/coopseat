import Link from 'next/link';
import { Download } from 'lucide-react';
import { Brand } from '@coopseat/ui/design';
import { getDictionary } from '@/i18n/server';
import { DOWNLOAD_URL } from '@/lib/links';
import { getPageAccount } from '@/server/page-session';
import { SiteAccountMenu } from './SiteAccountMenu';

export async function SiteHeader() {
  const [dict, account] = await Promise.all([
    getDictionary(),
    getPageAccount(),
  ]);
  const h = dict.home;
  const nav = [
    { href: '/#features', label: h.nav.features },
    { href: '/#how', label: h.nav.how },
    { href: '/#party', label: h.nav.party },
    { href: '/#faq', label: h.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft/70 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Brand href="/" version={null} />
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition hover:text-strong"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {account ? (
            <div className="hidden sm:block">
              <SiteAccountMenu
                account={{
                  nickname: account.nickname,
                  email: account.email,
                  avatarUrl: account.avatarUrl,
                }}
                labels={{
                  myAccount: h.myAccount,
                  myRoom: dict.account.myRoom,
                  play: h.playFromMenu,
                  signOut: dict.account.signOut,
                }}
              />
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-[#d4dee8] transition hover:bg-white/5 sm:block"
            >
              {h.signIn}
            </Link>
          )}
          <a
            href={DOWNLOAD_URL}
            className="inline-flex items-center gap-2 rounded-lg border border-accent-border bg-accent px-4 py-2 text-sm font-[650] text-accent-ink transition hover:bg-accent-hover"
          >
            <Download size={16} />
            {h.downloadShort}
          </a>
        </div>
      </div>
    </header>
  );
}
