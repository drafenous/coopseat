import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Play, Tv } from 'lucide-react';
import { Brand, buttonClass } from '@coopseat/ui/design';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getDictionary } from '@/i18n/server';
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
  const account = await getPageAccount();
  if (!account) redirect('/login?next=/account');
  const [params, t] = await Promise.all([searchParams, getDictionary()]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Brand href="/" version={null} />
        <div className="flex items-center gap-3">
          {account.nickname && (
            <a
              href={`/party/${encodeURIComponent(account.nickname)}`}
              title={t.account.myRoomLink}
              className={buttonClass({ variant: 'secondary', compact: true })}
            >
              <Tv size={14} />
              {t.account.myRoom}
            </a>
          )}
          <a
            href="/play"
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
