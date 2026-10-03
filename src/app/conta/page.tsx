import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPageAccount } from '@/server/page-session';
import { AccountPanel } from './AccountPanel';

export const metadata: Metadata = { title: 'Minha conta', robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<'/conta'>) {
  const account = await getPageAccount();
  if (!account) redirect('/entrar?next=/conta');
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white">CoopSeat</Link>
        <span className="text-sm text-muted">{account.email}</span>
      </header>
      <AccountPanel
        initial={account}
        notice={
          params['vinculado'] ? 'Conta vinculada com sucesso.' : params['verificacao'] ? 'Recebemos sua verificação. O resultado aparece aqui em instantes.' : undefined
        }
      />
    </main>
  );
}
