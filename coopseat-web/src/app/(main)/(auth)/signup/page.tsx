import type { Metadata } from 'next';
import Link from 'next/link';
import { ProviderButtons } from '@/components/ProviderButtons';
import { Card, Divider } from '@/components/ui';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';
import { SignupForm } from './SignupForm';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return {
    ...pageMetadata({
      locale,
      path: '/signup',
      title: meta.signup,
      description: meta.signupDescription,
      imageAlt: meta.title,
    }),
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default async function SignupPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  const href = (path: string) => localeHref(locale, path);
  return (
    <Card
      title={t.signup.title}
      subtitle={
        <>
          {t.signup.haveAccount}{' '}
          <Link href={href('/login')} className="text-accent">
            {t.signup.signIn}
          </Link>
        </>
      }
    >
      <ProviderButtons
        action={t.providers.continueWith}
        next={href('/account?welcome=1')}
      />
      <Divider label={t.common.orWithEmail} />
      <SignupForm />
    </Card>
  );
}
