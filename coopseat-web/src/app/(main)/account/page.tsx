import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Brand } from '@coopseat/ui/design';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getDictionary } from '@/i18n/server';
import { getPageAccount } from '@/server/page-session';
import { AccountPanel } from './AccountPanel';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.account, robots: { index: false } };
}

export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const account = await getPageAccount();
  if (!account) redirect('/login?next=/account');
  const [params, t] = await Promise.all([searchParams, getDictionary()]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Brand href="/" version={null} />
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">{account.email}</span>
          <LanguageSwitcher />
        </div>
      </header>
      <AccountPanel
        initial={account}
        notice={params['linked'] ? t.account.linked : params['verified'] ? t.account.verificationReceived : undefined}
      />
    </main>
  );
}
