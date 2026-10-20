import type { Metadata } from 'next';
import Link from 'next/link';
import { ProviderButtons } from '@/components/ProviderButtons';
import { Card, Divider } from '@/components/ui';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';
import { safeNextPath } from '@/server/http';
import { LoginForm } from './LoginForm';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return {
    ...pageMetadata({
      locale,
      path: '/login',
      title: meta.login,
      description: meta.loginDescription,
      imageAlt: meta.title,
    }),
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const [params, t, locale] = await Promise.all([
    searchParams,
    getDictionary(),
    getLocale(),
  ]);
  const href = (path: string) => localeHref(locale, path);
  const next = safeNextPath(
    typeof params['next'] === 'string' ? params['next'] : null,
    href('/account'),
  );
  return (
    <Card
      title={t.login.title}
      subtitle={
        <>
          {t.login.noAccount}{' '}
          <Link href={href('/signup')} className="text-accent">
            {t.login.signUp}
          </Link>
        </>
      }
    >
      <ProviderButtons next={next} action={t.providers.signInWith} />
      <Divider label={t.common.orWithEmail} />
      <LoginForm next={next} />
      <p className="text-center text-sm">
        <Link
          href={href('/forgot-password')}
          className="text-muted hover:text-foreground"
        >
          {t.login.forgot}
        </Link>
      </p>
    </Card>
  );
}
