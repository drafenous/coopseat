import { notFound, redirect } from 'next/navigation';
import { getLocale } from '@/i18n/server';
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
  const account = await getPageAccount();
  if (!account)
    redirect(`/login?next=${encodeURIComponent(`/party/${nickname}`)}`);
  return <PartyClient locale={await getLocale()} nickname={nickname} />;
}
