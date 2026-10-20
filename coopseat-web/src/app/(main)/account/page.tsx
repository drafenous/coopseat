import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Play, Tv } from 'lucide-react';
import { Brand, buttonClass } from '@coopseat/ui/design';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { getPageAccount } from '@/server/page-session';
import { AccountPanel } from './AccountPanel';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getDictionary()).meta.account,
    robots: { index: false },
  };
}

export default async function AccountPage({
  searchParams,
}: PageProps<'/account'>) {
  const [account, locale] = await Promise.all([getPageAccount(), getLocale()]);
  const href = (path: string) => localeHref(locale, path);
  if (!account)
    redirect(`${href('/login')}?next=${encodeURIComponent(href('/account'))}`);
  const [params, t] = await Promise.all([searchParams, getDictionary()]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Brand href={href('/')} version={null} />
        <div className="flex items-center gap-3">
          {account.nickname && (
            <a
              href={href(`/party/${encodeURIComponent(account.nickname)}`)}
              title={t.account.myRoomLink}
              className={buttonClass({ variant: 'secondary', compact: true })}
            >
              <Tv size={14} />
              {t.account.myRoom}
            </a>
          )}
          <a
            href={href('/play')}
            className={buttonClass({ variant: 'secondary', compact: true })}
          >
            <Play size={14} />
            {t.account.play}
          </a>
          <LanguageSwitcher />
        </div>
      </header>
      <AccountPanel
        initial={account}
        initialTab={params['linked'] ? 'security' : undefined}
        notice={
          params['linked']
            ? t.account.linked
            : params['verified']
              ? t.account.verificationReceived
              : undefined
        }
      />
    </main>
  );
}
