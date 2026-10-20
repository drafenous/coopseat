import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { localeHref } from '@/i18n/config';
import { getDictionary, getLocale } from '@/i18n/server';
import { pageMetadata } from '@/lib/seo';
import { TERMS_VERSION } from '@/lib/validation/account';

export async function generateMetadata(): Promise<Metadata> {
  const [{ meta }, locale] = await Promise.all([getDictionary(), getLocale()]);
  return pageMetadata({
    locale,
    path: '/terms',
    title: meta.terms,
    description: meta.termsDescription,
    imageAlt: meta.title,
  });
}

export default async function TermsPage() {
  const [t, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <LegalPage
      t={t.legal}
      title={t.terms.title}
      subtitle={t.terms.version(TERMS_VERSION)}
      sections={t.terms.sections}
      related={{
        href: localeHref(locale, '/privacy'),
        label: t.common.privacyPolicy,
      }}
    />
  );
}
