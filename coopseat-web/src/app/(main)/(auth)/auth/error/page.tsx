import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card } from '@/components/ui';
import { errorMessage } from '@/i18n/dictionaries';
import { getDictionary } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.authError };
}

export default async function AuthErrorPage({ searchParams }: PageProps<'/auth/error'>) {
  const [params, t] = await Promise.all([searchParams, getDictionary()]);
  const code = typeof params['code'] === 'string' ? params['code'] : undefined;
  return (
    <Card title={t.authError.title}>
      <Alert>{errorMessage(t, code)}</Alert>
      <Link href="/login" className="block text-center text-sm text-accent">{t.common.backToLogin}</Link>
    </Card>
  );
}
