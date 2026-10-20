import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card } from '@/components/ui';
import { errorMessage } from '@/i18n/dictionaries';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getDictionary()).meta.authError,
    robots: { index: false },
  };
}

export default async function AuthErrorPage({
  searchParams,
}: PageProps<'/auth/error'>) {
  const [params, t, locale] = await Promise.all([
    searchParams,
    getDictionary(),
    getLocale(),
  ]);
  const code = typeof params['code'] === 'string' ? params['code'] : undefined;
  return (
    <Card title={t.authError.title}>
      <Alert>{errorMessage(t, code)}</Alert>
      <Link
        href={localeHref(locale, '/login')}
        className="block text-center text-sm text-accent"
      >
        {t.common.backToLogin}
      </Link>
    </Card>
  );
}
