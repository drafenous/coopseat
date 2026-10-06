import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { getDictionary } from '@/i18n/server';
import { ForgotForm } from './ForgotForm';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getDictionary()).meta.forgotPassword,
    robots: { index: false },
  };
}

export default async function ForgotPage() {
  const t = await getDictionary();
  return (
    <Card
      title={t.forgot.title}
      subtitle={
        <>
          {t.forgot.remembered}{' '}
          <Link href="/login" className="text-accent">
            {t.common.backToLogin}
          </Link>
        </>
      }
    >
      <ForgotForm />
    </Card>
  );
}
