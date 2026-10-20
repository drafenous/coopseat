import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert, Card, buttonClass } from '@/components/ui';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getDictionary()).meta.emailConfirmed,
    robots: { index: false },
  };
}

export default async function ConfirmedPage({
  searchParams,
}: PageProps<'/auth/confirmed'>) {
  const [params, t, locale] = await Promise.all([
    searchParams,
    getDictionary(),
    getLocale(),
  ]);
  const href = (path: string) => localeHref(locale, path);
  if (params['error']) {
    return (
      <Card title={t.confirmed.invalidTitle}>
        <Alert>{t.confirmed.invalidBody}</Alert>
        <Link
          href={href('/login')}
          className="block text-center text-sm text-accent"
        >
          {t.common.goToLogin}
        </Link>
      </Card>
    );
  }
  const emailChange = params['type'] === 'email_change';
  return (
    <Card
      title={
        emailChange ? t.confirmed.emailUpdated : t.confirmed.emailConfirmed
      }
    >
      <Alert tone="success">
        {emailChange
          ? t.confirmed.emailUpdatedBody
          : t.confirmed.emailConfirmedBody}
      </Alert>
      <a href="coopseat://auth/confirmed" className={buttonClass()}>
        {t.common.openApp}
      </a>
      <Link
        href={href('/account')}
        className="block text-center text-sm text-muted hover:text-foreground"
      >
        {t.confirmed.continueInBrowser}
      </Link>
    </Card>
  );
}
