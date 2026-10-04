import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card } from '@/components/ui';
import { getDictionary } from '@/i18n/server';
import { getPageSession } from '@/server/page-session';
import { ResetForm } from './ResetForm';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.resetPassword, robots: { index: false } };
}

export default async function ResetPage() {
  const [session, t] = await Promise.all([getPageSession(), getDictionary()]);
  return (
    <Card title={t.reset.title}>
      {session ? (
        <ResetForm />
      ) : (
        <Alert>
          {t.reset.expired((label) => <Link href="/forgot-password" className="underline">{label}</Link>)}
        </Alert>
      )}
    </Card>
  );
}
