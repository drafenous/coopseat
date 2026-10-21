import type { Metadata } from 'next';
import Link from 'next/link';
import { ProviderButtons } from '@/components/ProviderButtons';
import { Card, Divider } from '@/components/ui';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';
import { pkceChallengeSchema } from '@/lib/validation/account';
import { safeNextPath } from '@/server/http';
import { LoginForm } from './LoginForm';

function desktopChallengeOf(
  params: Record<string, string | string[] | undefined>,
) {
  if (params['client'] !== 'desktop' || typeof params['challenge'] !== 'string')
    return undefined;
  const parsed = pkceChallengeSchema.safeParse(params['challenge']);
  return parsed.success ? parsed.data : undefined;
}

function prefillEmail(value: string | string[] | undefined) {
  if (typeof value !== 'string') return undefined;
  const email = value.trim();
  if (!email || email.length > 254 || !email.includes('@') || /\s/.test(email))
    return undefined;
  return email;
}

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
  const desktopChallenge = desktopChallengeOf(params);
  const email = prefillEmail(params['email']);
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
      <ProviderButtons
        next={next}
        action={t.providers.signInWith}
        desktopChallenge={desktopChallenge}
      />
      <Divider label={t.common.orWithEmail} />
      <LoginForm
        next={next}
        desktopChallenge={desktopChallenge}
        defaultEmail={email}
      />
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
